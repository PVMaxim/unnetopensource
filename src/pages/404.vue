<template>
  <main>
    <div class="container-main">
      <div class="bigtitle">
        404
      </div>
      <div class="title">{{ $t('pages.notfound.title') }}</div>
      <div class="subtitle">{{ $t('pages.notfound.subtitle') }}</div>
      <div class="links">
        <router-link :to="{ name: 'authorization' }">
          {{ $t('go_home') }}
        </router-link>
      </div>
    </div>
  </main>
</template>

<script>

export default {
  layout: 'default',

  components: {
  }
}
</script>

<style scoped lang="scss">
body {
  main {
    height: calc(100% - 144px);
    padding-top: 0px;
  }
  .container-main {
    flex-direction: column;
  }
}
.bigtitle {
  font-size: 5rem !important;
  text-align: center;
    font-weight: 700;
    color: $color-orange;
    margin-bottom: 48px;
}

.title {
  font-size: 1.7rem;
    text-align: center;
    color: $color-orange;
    margin-bottom: 24px;
}

.subtitle {
    font-size: 1.2rem;
    text-align: center;
    color: #fff;
    margin-bottom: 9px;
}

.links {
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border: none;
  padding: 12px 18px;
  margin-top: 24px;

  a {
    display: flex;
    flex-direction: row;
    align-items: center;
    color: rgba(255, 159, 0, 1);

    &:hover {
      color: rgba(255, 159, 0, .7);
    }
    &:after {
      content:url('data:image/svg+xml,<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><g id="Group"><g id="Group_2"><g id="Path"><path fill-rule="evenodd" clip-rule="evenodd" d="M19 12H5H19Z" fill="%23FF9800"/><path d="M19 12H5" stroke="%23FF9800" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></g><g id="Path_2"><path fill-rule="evenodd" clip-rule="evenodd" d="M14 17L19 12L14 17Z" fill="%23FF9800"/><path d="M14 17L19 12" stroke="%23FF9800" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></g><g id="Path_3"><path fill-rule="evenodd" clip-rule="evenodd" d="M14 7L19 12L14 7Z" fill="%23FF9800"/><path d="M14 7L19 12" stroke="%23FF9800" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></g></g></g></svg>');
      width: 24px;
      height: 24px;
      margin-left: 6px;
    }
  }
}
</style>