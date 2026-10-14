import { rpcList } from '@/api/constants-types';
import { getOrCreateManager } from '../api/ApiHandler';
import { store } from '../store/index.js';
import { router } from '../router/index.js';

/**
 * The context object passed between handlers.
 * For now it's empty, but can be used to pass state.
 */
interface AppContext { }

/**
 * The Handler interface declares a method for building the chain of handlers
 * and a method for executing a check.
 */
interface IHandler {
  setNext(handler: IHandler): IHandler;
  handle(context: AppContext): Promise<AppContext | null>;
}

/**
 * The Abstract Handler class providing the default chaining behavior.
 */
abstract class AbstractAppCheckHandler implements IHandler {
  private nextHandler: IHandler | null = null;

  public setNext(handler: IHandler): IHandler {
    this.nextHandler = handler;
    return handler;
  }

  public async handle(context: AppContext): Promise<AppContext | null> {
    if (this.nextHandler) {
      return this.nextHandler.handle(context);
    }
    // The chain successfully completed.
    return context;
  }
}

/**
 * Checks if the number of configured RPC providers matches the available list.
 * If not, it assumes a configuration change and forces re-authorization.
 */
class ProviderCountCheckHandler extends AbstractAppCheckHandler {
  public async handle(context: AppContext): Promise<AppContext | null> {
    console.log('ProviderCountCheckHandler: Checking provider count...');
    const selectedTokenKeys = Object.keys(store?.state?.user?.selectedToken || {});
    const rpcListNames = rpcList.map(rpc => rpc.name);
    const hasKeyMismatch = rpcListNames.some(name => !selectedTokenKeys.includes(name));

    if (store && rpcList.length > 0 && (selectedTokenKeys.length !== rpcList.length || hasKeyMismatch)) {
      console.warn(`ProviderCountCheckHandler: store = ${selectedTokenKeys.length}, rpcList = ${rpcList.length}, mismatch = ${hasKeyMismatch}`);
      await store.dispatch('user/resetToken');
      await store.dispatch('swap/resetBalances');
      await router.push({ name: 'authorization' });

      return null;
    }
    console.log('ProviderCountCheckHandler: OK.');
    return super.handle(context);
  }
}

/**
 * Checks if the stored tokenBalance for each chain has all mandatory/manifest tokens.
 * If any chain has fewer tokens or missing tokens (e.g. from previous tests or manifest updates),
 * it syncs and adds the missing tokens while preserving existing balances and sort order.
 */
class TokenCountCheckHandler extends AbstractAppCheckHandler {
  public async handle(context: AppContext): Promise<AppContext | null> {
    console.log('TokenCountCheckHandler: Checking token count and integrity...');
    const userTokenBalance = store?.state?.user?.tokenBalance;
    if (userTokenBalance && typeof userTokenBalance === 'object') {
      let isUpdated = false;
      const updatedBalance: Record<string, any[]> = { ...userTokenBalance };

      for (const rpc of rpcList) {
        try {
          const mgr = getOrCreateManager(rpc.name, false);
          const manifestTokens = mgr.getTokens();
          const currentList = Array.isArray(updatedBalance[rpc.name]) ? updatedBalance[rpc.name] : [];

          if (currentList.length === 0) {
            continue;
          }

          let hasMissing = false;
          const mergedList = [...currentList];
          for (const token of manifestTokens) {
            if (token?.id && !mergedList.some((item: any) => item?.root?.toLowerCase() === token.id.toLowerCase())) {
              mergedList.push({ root: token.id });
              hasMissing = true;
            }
          }

          if (hasMissing || currentList.length < manifestTokens.length) {
            console.log(`TokenCountCheckHandler: Chain ${rpc.name} missing tokens, updating from ${currentList.length} to ${mergedList.length}`);
            updatedBalance[rpc.name] = mergedList;
            isUpdated = true;
          }
        } catch (err) {
          console.warn(`TokenCountCheckHandler error for ${rpc.name}:`, err);
        }
      }

      if (isUpdated) {
        for (const [provider, list] of Object.entries(updatedBalance)) {
          if (list !== userTokenBalance[provider]) {
            await store.dispatch('user/setTokenBalance', {
              provider,
              value: list,
            });
          }
        }
      }
    }
    console.log('TokenCountCheckHandler: OK.');
    return super.handle(context);
  }
}

/**
 * Placeholder handler to demonstrate how to add more checks to the chain.
 */
class SanityCheckHandler extends AbstractAppCheckHandler {
  public async handle(context: AppContext): Promise<AppContext | null> {
    console.log('SanityCheckHandler: Performing a sanity check...');
    console.log('SanityCheckHandler: OK.');
    return super.handle(context);
  }
}

/**
 * The client code that builds and runs the chain of application checks.
 */
export async function runApplicationChecks() {
  const providerCountCheck = new ProviderCountCheckHandler();
  const tokenCountCheck = new TokenCountCheckHandler();
  const sanityCheck = new SanityCheckHandler();

  providerCountCheck
    .setNext(tokenCountCheck)
    .setNext(sanityCheck);
  console.log('--- Running application pre-flight checks ---');

  try {
    const result = await providerCountCheck.handle({});
    if (result) {
      console.log('All application checks passed successfully!');
    } else {
      console.log('Application checks halted by a handler.');
    }
  } catch (error) {
    if (error instanceof Error) {
      console.error('Application checks failed:', error.message);
    } else {
      console.error('An unknown error occurred during application checks:', error);
    }
  }
}