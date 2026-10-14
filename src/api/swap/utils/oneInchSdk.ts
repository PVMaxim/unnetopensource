import { randomBytes } from "crypto";
import { solidityPackedKeccak256 } from "ethers";
import { HashLock, MerkleLeaf } from "@1inch/cross-chain-sdk";

export const generateSecrets = (count: number) => {
  return Array.from({ length: count }).map(
    () => "0x" + Buffer.from(randomBytes(32)).toString("hex")
  );
};

export const getHashesFromSecrets = (secrets: string[]) => {
  const secretHashes = secrets.map((x) => HashLock.hashSecret(x));
  const secretsCount = secrets.length;
  const hashLock =
    secretsCount === 1
      ? HashLock.forSingleFill(secrets[0])
      : HashLock.forMultipleFills(
          secretHashes.map(
            (secretHash, i) =>
              solidityPackedKeccak256(
                ["uint64", "bytes32"],
                [i, secretHash.toString()]
              ) as MerkleLeaf
          )
        );
  return hashLock;
};

export const genSecretsAndHashes = (count: number) => {
  const secrets = generateSecrets(count);
  const secretHashes = secrets.map((x) => HashLock.hashSecret(x));
  const hashLock = getHashesFromSecrets(secrets);
  return { secrets, hashLock, secretHashes };
};
