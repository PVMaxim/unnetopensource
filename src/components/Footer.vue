<template>
  <footer>
    <div class="container-main">
      <div class="footer-title">
        United Network 
      </div>
      <div class="footer-copyright">
        ©2024 - {{new Date().getUTCFullYear()}} {{ $t('footer.allRightsReserved') }}
      </div>
      <a class="united-site" href="//united.network">
        united.network
      </a>
    </div>
  </footer>
</template>

<script>
import { defineComponent } from 'vue'

export default defineComponent({
  name: 'Footer',
  components: {
  },
    setup() {
      return {  }
    }
})
</script>

<style scoped lang="scss">
footer {
  width: 100%;
  color: $color-gray;
  padding-bottom: 24px;
  display: flex;
  position: relative;

  .united-site {
    margin-top: 5px;
    padding: 7px 13px;
    color: $color-orange;

    &:hover{
      color: $color-orange-hover;
    }
    }

  .container-main {
    flex-direction: column;
  }

}

@media (max-width: 480px) {

}
</style>
