<template>
    <div class="app-intention-header">
        <div class="app-title-container">
            <Avatar class="app-icon" :border="false" :size="50" :imageSrc="getProxiedUrl(metadata?.icons?.[0], 'image') || WC_LOGO_URL" name="" />
            <div class="app-name">{{ metadata?.name }}</div>
            <a class="app-url" :href="metadata?.url" target="_blank">
                <span v-if="validation == 'VALID'" class="app-verification-valid">
                    &#x2713;&nbsp;
                </span>
                {{ appWebSite }}
            </a>
            <div v-if="validation == 'SCAM'" class="app-verification app-verification-scam">
                Potential threat!
            </div>
            <div v-else-if="validation == 'UNKNOWN'" class="app-verification app-verification-unknown">
                Unable to verify app domain
            </div>
            <div v-else-if="validation == 'INVALID'" class="app-verification app-verification-invalid">
                App domain mismatch!
            </div>
        </div>

        <div v-if="$slots.intention" class="app-intention">
            <slot name="intention"></slot>
        </div>
    </div>
</template>

<script>
import { defineComponent } from "vue";
import Avatar from "vue3-avatar";
import { getProxiedUrl } from "@/modules/wallet-connect/api/wcHelper";

export default defineComponent({
    name: "AppIntentionHeader",
    props: {
        metadata: Object,
        verifyContext: Object,
    },
    components: {
        Avatar,
    },

    setup(props) {
        const WC_LOGO_URL = new URL(`@/assets/images/walletConnectLogo.svg`, import.meta.url).href;

        let host = '';
        try {
            host = new URL(props.metadata?.url).host;
        } catch (_) { }
        const appWebSite = host ?? 'Web site';

        const validation = props.verifyContext?.verified.isScam
            ? "SCAM"
            : props.verifyContext?.verified.validation ?? "UNKNOWN";

        return { validation, appWebSite, WC_LOGO_URL, getProxiedUrl };
    },
});
</script>

<style scoped lang="scss">
.app-intention-header {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    gap: 15px;

    justify-items: center;
}

.app-title-container {
    display: flex;
    flex-direction: column;
    gap: 5px;

    text-align: center;
    overflow-wrap: anywhere;
}

.app-icon {
    margin: auto;
}

.app-name {
    font-size: 20px;
    font-weight: 400;
    color: $color-white;
}

.app-url {
    font-size: 15px;
    font-weight: 400;
    color: gray;
    color: rgba($color-white, .5);
}

.app-verification-valid {
    color: $color-green;
    font-weight: 600;
    font-size: 15px;
}

.app-verification {
    width: fit-content;
    padding: 2px 10px 2px 10px;
    border-radius: 24px;
    margin: auto;

    text-align: center;
    overflow-wrap: anywhere;
    font-size: 15px;
}

.app-verification-unknown {
    background-color: $color-gray;
    color: $color-black;
    font-weight: 400;
}

.app-verification-invalid {
    background-color: yellow;
    color: $color-black;
    font-weight: 600;
}

.app-verification-scam {
    background-color: $color-red;
    color: $color-black-32;
    font-weight: 600;
}

.app-intention {
    margin: auto;

    font-size: 20px;
    font-weight: 600;
}
</style>