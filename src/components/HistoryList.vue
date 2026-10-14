<template>
  <div class="token-item" v-for="(item, index) in inputData" :key="index" :data-token=JSON.stringify(item) @click=goToSendHandler>
    <div class="token-column-first">
      <div class="token-icon">
        <TokenIcon  v-if="typeof item === 'object'" :tokenIconSymbol="item?.symbol" :tokenIconUrl="item?.iconUrl" iconClass="icon" />
      </div>
      <div class="token-col">
        <div class="token-balance">
          {{ roundNumber(item?.balance, 6) }}
        </div>
        <div class="token-symbol">
          {{ item?.symbol }}
        </div>
      </div>
    </div>
    <div :data-token=JSON.stringify(item) class="token-btn" @click=goToSendHandler>
      <narrow />
    </div>
  </div>
</template>

<script>
import { defineComponent, ref } from 'vue'
import { useStore } from 'vuex';
import { roundNumber } from '@/api/sub-utils';
import { useRouter } from 'vue-router';
import TokenIcon from "@/components/TokenIcon.vue";
import narrow from '@/components/svg/narrowRight.vue';
import boxIcon from '@/components/svg/boxIcon.vue';

export default defineComponent({
  name: 'DashboardList',
    props: {
      inputData: {
        type: [Array, Object],
        default: [],
        required: true
      },
    },
    components: {
      TokenIcon,
      boxIcon,
      narrow
    },

    setup(props) {
      const store = useStore();
      const router = useRouter();
      const error = ref(undefined);

      // console.log(`props.inputData: ${JSON.stringify(props.inputData)}`);

      const goToSendHandler = async (e) => {
        let token = JSON.parse(e.currentTarget?.getAttribute('data-token'));
        store.dispatch('user/setSelectedToken', {"key":store.state.settings.rpcProvider?.name, "value":token} ).then(() => {
        }).catch((error) => {
          error.value = error;
        });
        // console.log(`goToSendHandler user/setSelectedToken data is ${JSON.stringify({[store.state.settings.rpcProvider?.name]:token})}`);
        router.push({ name: 'send' });
      }

      return { roundNumber , goToSendHandler}
    }
})
</script>

<style scoped lang="scss">
.token-item {
  display: flex;
  flex-direction: row;
  width: 100% ;
  align-items: center;
  justify-content: space-between;
  padding: 9px 0;

  .token-column-first{
    display: flex;
    flex-direction: row;
  }

  .token-btn {
    display: flex;
    width: 24px;
    height: 24px;
    align-items: center;
    justify-content: center;

    svg {
      width: 14px;
      height: 14px;
    }
  }
  &:not(:last-child) {
    border-bottom: 1px solid $color-black-32;
  }
}

</style>