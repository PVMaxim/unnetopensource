import { rpcList } from '@/api/constants-types';
import { getOrCreateManager } from '../api/ApiHandler';
import { store } from '../store/index.js';
import { router } from '../router/index.js';

interface AppContext { }

interface IHandler {
  setNext(handler: IHandler): IHandler;
  handle(context: AppContext): Promise<AppContext | null>;
}

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
    return context;
  }
}

class ProviderCountCheckHandler extends AbstractAppCheckHandler {
  public async handle(context: AppContext): Promise<AppContext | null> {
    const selectedTokenKeys = Object.keys(store?.state?.user?.selectedToken || {});
    const rpcListNames = rpcList.map(rpc => rpc.name);
    const hasKeyMismatch = rpcListNames.some(name => !selectedTokenKeys.includes(name));

    if (store && rpcList.length > 0 && (selectedTokenKeys.length !== rpcList.length || hasKeyMismatch)) {
      await store.dispatch('user/resetToken');
      await store.dispatch('swap/resetBalances');
      await router.push({ name: 'authorization' });

      return null;
    }
    return super.handle(context);
  }
}

class TokenCountCheckHandler extends AbstractAppCheckHandler {
  public async handle(context: AppContext): Promise<AppContext | null> {
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
            updatedBalance[rpc.name] = mergedList;
            isUpdated = true;
          }
        } catch (err) {
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
    return super.handle(context);
  }
}

class SanityCheckHandler extends AbstractAppCheckHandler {
  public async handle(context: AppContext): Promise<AppContext | null> {
    return super.handle(context);
  }
}

export async function runApplicationChecks() {
  const providerCountCheck = new ProviderCountCheckHandler();
  const tokenCountCheck = new TokenCountCheckHandler();
  const sanityCheck = new SanityCheckHandler();

  providerCountCheck
    .setNext(tokenCountCheck)
    .setNext(sanityCheck);

  try {
    const result = await providerCountCheck.handle({});
    if (result) {
    } else {
    }
  } catch (error) {
    if (error instanceof Error) {
    } else {
    }
  }
}