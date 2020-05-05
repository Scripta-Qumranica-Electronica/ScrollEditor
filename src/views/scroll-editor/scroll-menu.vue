<template>
    <div id="scroll-side-menu" role="tablist">
        <section>
            <b-card no-body class="mb-1">
                <b-card-header header-tag="header" class="p-1" role="tab">
                    <b-button
                        block
                        href="#"
                        v-b-toggle.accordion-actions
                        variant="info"
                    >{{$t('misc.actions')}}</b-button>
                </b-card-header>
                <b-collapse
                    id="accordion-actions"
                    style="display:block;"
                    accordion="my-accordion-side"
                    role="tabpanel"
                >
                    <b-card-body>
                        <section class="center-btn">
                            <b-button @click="openScrollModal()">{{$t('misc.add')}}</b-button>
                        </section>
                    </b-card-body>
                </b-collapse>
            </b-card>
        </section>
        <scroll-modal></scroll-modal>
    </div>
</template>

<script lang="ts">
import { Component, Prop, Vue } from 'vue-property-decorator';
import Waiting from '@/components/misc/Waiting.vue';
import { Artefact } from '@/models/artefact';
import ScrollModal from './scroll-modal.vue';

@Component({
    name: 'scroll-menu',
    components: {
        Waiting,
        'scroll-modal': ScrollModal
    }
})
export default class ScrollMenu extends Vue {
    public openScrollModal() {
        this.$root.$emit('bv::show::modal', 'scrollModal');
    }
}
</script>

<style lang="scss" scoped>
#scroll-side-menu {
    touch-action: pan-y;
    top: 0;
    right: 0;
}
</style>
