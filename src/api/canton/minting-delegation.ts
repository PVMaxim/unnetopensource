import { AcsReader } from "@canton-network/core-acs-reader";
import { CardKeys, Request } from "../common";
import { getEd25519Key } from "../utils";
import { CantonCore, CantonOnboardingStep } from "./core";

const AMULET_MERGE_LIMIT = "10";
const DELEGATION_EXPIRATION = 365 * 24 * 60 * 60 * 1000;

export class MintingDelegationManager {

    private readonly _coreFactory: () => Promise<CantonCore>;
    private readonly _dso: string;
    private readonly _usersWithDelegations: Set<string>;

    constructor(args: {
        coreFactory: () => Promise<CantonCore>,
        dso: string,
    }) {
        this._coreFactory = args.coreFactory;
        this._dso = args.dso;
        this._usersWithDelegations = new Set();
    }

    async exists(keys: CardKeys): Promise<boolean> {
        const cardPublicKey = getEd25519Key(keys);
        let delegationExists = this._usersWithDelegations.has(cardPublicKey);

        if( !delegationExists ) {
            delegationExists = await this._exists(keys);
            if( delegationExists ) {
                this._usersWithDelegations.add(cardPublicKey);
            }
        }

        return delegationExists;
    }

    create(keys: CardKeys): Request {
        return new CantonOnboardingStep({
            getCore: () => this._coreFactory(),
            keys,
            lazyArgs: async () => {
                const core = await this._coreFactory();
                const userParty = await CantonCore.getWalletAddress(keys);
                const validatorParty = await core.validatorParty.get();
                const expiresAt = new Date(Date.now() + DELEGATION_EXPIRATION).toISOString();

                return {
                    commands: [
                        {
                            "CreateCommand": {
                                "templateId": "#splice-wallet:Splice.Wallet.MintingDelegation:MintingDelegationProposal",
                                "createArguments": {
                                    "delegation": {
                                        "beneficiary": userParty,
                                        "delegate": validatorParty,
                                        "dso": this._dso,
                                        "expiresAt": expiresAt,
                                        "amuletMergeLimit": AMULET_MERGE_LIMIT,
                                    },
                                },
                            },
                        }
                    ],
                };
            },
            actionType: "MINTING_DELEGATION",
        });
    }

    private async _exists(keys: CardKeys): Promise<boolean> {
        const core = await this._coreFactory();
        const reader = new AcsReader(core.ledgerProvider);
        const ledgerEnd = await core.getLedgerEnd();
        const userParty = await CantonCore.getWalletAddress(keys);
        const validatorParty = await core.validatorParty.get();

        const activeContracts = await reader.getActiveContracts({
            offset: ledgerEnd,
            parties: [userParty],
            filterByParty: true,
            templateIds: [
                "#splice-wallet:Splice.Wallet.MintingDelegation:MintingDelegationProposal",
                "#splice-wallet:Splice.Wallet.MintingDelegation:MintingDelegation",
            ],
        });

        for( const contract of activeContracts ) {
            if( !contract.contractEntry ||
                !("JsActiveContract" in contract.contractEntry)
            ) {
                continue;
            }

            const event = contract.contractEntry?.JsActiveContract?.createdEvent;
            if( event.packageName !== "splice-wallet" ) {
                continue;
            }

            const delegationTid = `${event.representativePackageId}:Splice.Wallet.MintingDelegation:MintingDelegation`;
            const proposalTid = `${event.representativePackageId}:Splice.Wallet.MintingDelegation:MintingDelegationProposal`;

            let found: boolean = false;
            if( event.templateId === delegationTid ) {
                found = this._isValidDelegation({
                    validatorParty,
                    userParty,
                    delegation: event.createArgument as any,
                });
            } else if( event.templateId === proposalTid ) {
                found = this._isValidDelegation({
                    validatorParty,
                    userParty,
                    delegation: (event.createArgument as any)?.delegation,
                });
            }

            if( found ) {
                return true;
            }
        }

        return false;
    }

    private _isValidDelegation(args: {
        validatorParty: string,
        userParty: string,
        delegation?: {
            beneficiary?: string,
            delegate?: string,
            dso?: string,
            expiresAt?: string,
            amuletMergeLimit?: string,
        },
    }) {
        const expirationTs = Date.parse(args.delegation?.expiresAt ?? "");
        return args.delegation?.delegate === args.validatorParty &&
               args.delegation?.beneficiary === args.userParty &&
               args.delegation?.dso === this._dso &&
               !isNaN(expirationTs) &&
               expirationTs > Date.now();
    }
}
