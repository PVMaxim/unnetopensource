import { AcsReader } from "@canton-network/core-acs-reader";
import { matchInterfaceIds } from "@canton-network/core-tx-parser";
import { CardKeys, Request } from "../common";
import { getEd25519Key } from "../utils";
import { CantonCore, CantonOnboardingStep } from "./core";

const PREAPPROVAL_TEMPLATE_ID = "#splice-amulet:Splice.AmuletRules:TransferPreapproval";
const PROPOSAL_TEMPLATE_ID = "#splice-wallet:Splice.Wallet.TransferPreapproval:TransferPreapprovalProposal";

export class TransferPreapprovalManager {

    private readonly _coreFactory: () => Promise<CantonCore>;
    private readonly _dso: string;
    private readonly _usersWithPreapproval: Set<string>;

    constructor(args: {
        coreFactory: () => Promise<CantonCore>,
        dso: string,
    }) {
        this._coreFactory = args.coreFactory;
        this._dso = args.dso;
        this._usersWithPreapproval = new Set();
    }

    async exists(keys: CardKeys): Promise<boolean> {
        const cardPublicKey = getEd25519Key(keys);
        let found = this._usersWithPreapproval.has(cardPublicKey);

        if( !found ) {
            found = await this._exists(keys);
            if( found ) {
                this._usersWithPreapproval.add(cardPublicKey);
            }
        }

        return found;
    }

    create(keys: CardKeys): Request {
        return new CantonOnboardingStep({
            getCore: () => this._coreFactory(),
            keys,
            lazyArgs: async () => {
                const core = await this._coreFactory();
                const userParty = await CantonCore.getWalletAddress(keys);
                const validatorParty = await core.validatorParty.get();

                return {
                    commands: [
                        {
                            "CreateCommand": {
                                "templateId": PROPOSAL_TEMPLATE_ID,
                                "createArguments": {
                                    "receiver": userParty,
                                    "provider": validatorParty,
                                    "expectedDso": this._dso,
                                },
                            },
                        }
                    ],
                };
            },
            actionType: "CC_TRANSFER_PREAPPROVAL",
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
                PREAPPROVAL_TEMPLATE_ID,
                PROPOSAL_TEMPLATE_ID,
            ],
        });

        for( const contract of activeContracts ) {
            if( !contract.contractEntry ||
                !("JsActiveContract" in contract.contractEntry)
            ) {
                continue;
            }

            const event = contract.contractEntry?.JsActiveContract?.createdEvent;
            let found: boolean = false;

            if( matchInterfaceIds(event.templateId, PREAPPROVAL_TEMPLATE_ID) && event.packageName === "splice-amulet" ) {
                const preapprovalArgs = event.createArgument as any;
                const isExpired = !!preapprovalArgs.expiresAt &&
                    !isNaN(Date.parse(preapprovalArgs.expiresAt)) &&
                    Date.parse(preapprovalArgs.expiresAt) <= Date.now();

                found = preapprovalArgs.receiver === userParty &&
                    preapprovalArgs.provider === validatorParty &&
                    preapprovalArgs.dso === this._dso &&
                    !isExpired;
            }
            else if( matchInterfaceIds(event.templateId, PROPOSAL_TEMPLATE_ID) && event.packageName === "splice-wallet" ) {
                const proposalArgs = event.createArgument as any;
                found = proposalArgs.receiver === userParty &&
                    proposalArgs.provider === validatorParty &&
                    proposalArgs.expectedDso === this._dso;
            }

            if( found ) {
                return true;
            }
        }

        return false;
    }
}
