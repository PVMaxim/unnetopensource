<template>
  <main>
    <div class="container-main">
      <Loading v-if="isLoading" :messageLoad = messageLoad :titleLoad = titleLoad />
      <div v-else class="round-background">
        <CloseIcon class="close-icon" @click="redirectToHome()" />
        <img class="image" :src=token2049Img alt="United Network on Token 2049" loading="lazy" />
        <div class="content-box">
          <div class="title text-white">Meet <br/> United Network on <span class="text-blue">TOKEN2049</span>!</div>
          <div class="text-box text-gray text16">
            <ul>
              <li><span class="text-white">Subscribe</span> on our X account <span class="text-white"><a href="https://x.com/UN_wallet">@UN_wallet</a></span>;</li>
              <li>Contact the team;</li>
              <li>Check our wallet's FAQ and guide.</li>
            </ul>
            <div class="text18">All of this on our special <span class="text-white">TOKEN2049</span> tailored experience</div>
          </div>
          <Button
          buttonName="Get started!"
          buttonType="main"
          @onClick="redirectToLink()"
        />
        </div>
      </div>
    </div>
  </main>
</template>

<script>
import { onMounted, onUnmounted } from 'vue';
  import { useRouter } from 'vue-router';
  import Loading from '@/components/Loading.vue';
  import Button from "@/components/Button.vue";
  import CloseIcon from '@/components/svg/closeIcon.vue';
  
  export default {
    name: 'Token 2049',
    layout: 'Dashboard',
    components: {
      Loading,
      Button,
      CloseIcon,
    },
    setup() {
      const router = useRouter();
      const token2049Img = new URL(`@/assets/images/token2049.png`, import.meta.url).href;

      const redirectToLink = () => {
        window.open('https://link3.to/unitednetwork', '_blank');
      }

      const redirectToHome = () => {
        router.push({ name: 'landing' });
      }

      onMounted(() => {
        const script = document.createElement('script')
        script.setAttribute('id', 'twitter-ads');
        script.textContent = `!function(e,t,n,s,u,a){e.twq||(s=e.twq=function(){s.exe?s.exe.apply(s,arguments):s.queue.push(arguments);
          },s.version='1.1',s.queue=[],u=t.createElement(n),u.async=!0,u.src='https://static.ads-twitter.com/uwt.js',
          a=t.getElementsByTagName(n)[0],a.parentNode.insertBefore(u,a))}(window,document,'script');
          twq('config','qk2am');`
        document.head.appendChild(script)
      })

      onUnmounted(() => {
        const script = document.getElementById('twitter-ads');
        script.parentElement.removeChild(script);
      })

      return { token2049Img, redirectToLink, redirectToHome }
    },
  }
</script>

<style scoped lang="scss">
body main {
height: calc(100% - 64px);
padding-top:0;
}

.container-main {
  width: 90%;
  height: 100%;
  flex-direction: column;
  justify-content: flex-start;

  .title {
    font-size: 40px;
    font-size: 4vh;
    text-align: center;
    font-weight: bold;
    margin-bottom: 2vh;
    margin-top: 22vh;
  }

  .content-box {
    display: flex;
    flex-direction: column;
    flex-wrap: nowrap;
    align-items: center;
    justify-content: flex-start;
  }

  .text-box {
    display: flex;
    flex-direction: column;
    flex-wrap: nowrap;
    align-items: flex-start;
  }

  ul {
    padding-inline-start: 20px;

    li::marker {
      color: $color-white;
    }
  }

  .close-icon {
    position: absolute;
    width: 18px;
    height: 18px;
    stroke: $color-orange;
    right: 24px;
    top: 24px;
  }

  .text16 {
    font-size: 16px;
    font-size: 1.6vh;
    line-height: 1.4;
  }

  .text18 {
    font-size: 18px;
    font-size: 1.8vh;
    line-height: 1.6;
  }

  .text-blue {
    color: rgb(9, 118, 254);
  }

  .image {
    position: absolute;
    width: 27vh;
    top: 0;
    left: 55%;
    @include transforma(translateX(-50%) translateY(-30%));
  }

  button {
    width: 90%;
    margin-top: 3vh;
  }

  .round-background {
    display: flex;
    flex-direction: column;
    flex-wrap: nowrap;
    justify-content: center;
    align-items: center;
    position: relative;
    border: none;
    border-radius: 25px;
    padding: 24px 5%;
    background: rgb(34,34,34);
    background: linear-gradient(180deg, $color-black-34 0%, $color-black-24 80%);
    margin-top: 15vh;

    &.gradient-border {
      background: linear-gradient(180deg, $color-black-34 0%, $color-black-24 80%) padding-box,
            linear-gradient(to right bottom, rgba($color-orange, 0), rgba($color-orange, .3)) border-box;
      border: 1px solid transparent;
    }

    .gradient {
      position: absolute;
      width: 100%;
      height: 400px;
      left: 0px;
      top: 0px;
      background: radial-gradient(circle, rgba(255, 152, 0, 0.5) 0%, rgba(255, 152, 0, 0) 80%);
      background-position: 50% 170%;
      background-size: 100% 200%;
      background-repeat: no-repeat;
      z-index: 0;
    }

    .gradient-left {
      position: absolute;
      width: 100px;
      height: 100%;
      left: 0px;
      bottom: 0px;
      background: radial-gradient(circle, rgba(255, 152, 0, .5) 0%, rgba(255, 152, 0, 0) 80%);
      background-position: 100% 100%;
      background-size: 700px 150%;
      background-repeat: no-repeat;
    }

    .left-group {
      z-index: 1;
    }
    // &::before {
    //   content: '';
    //   width: 50vw;
    //   height: 50vw;
    //   background: radial-gradient(circle, rgba(255,152,0,1) 0%, rgba(255,152,0,0) 80%);
    // }
  }
}
@media (min-width: 769px) {
  .container-main{
    justify-content: center;

  .round-background {
    flex-direction: row;
    margin-top: 0px;
    width: 650px;
    padding: 24px;
    max-height: 400px;

    .title {
      margin-top: 0px;
    }

    .image {
      position: relative;
      width: initial;
      height: 100%;
      top: 0;
      left: 0;
      @include transforma(translateX(0) translateY(0));
    }
  }
}
}
</style>