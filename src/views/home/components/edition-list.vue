<template>
    <div>
        <p v-b-toggle="title">
            <i class="toggle-icon fa fa-angle-down" />{{ title }}
        </p>
        <b-collapse visible :id="title" class="mt-2">
            <div
                v-if="editions.length"
                :class="{ 'after-login': editions.length > 0 }"
            >
                <b-card
                    class="p-3"
                    no-body
                    v-for="edition in editions"
                    :key="edition.id"
                >
                    <!-- :key="edition.versionId"  does not exist-->

                    <edition-card
                        @edition-copy-click="openCopyEditionModal(edition)"
                        :edition="edition"
                    >
                    </edition-card>
                </b-card>
            </div>
        </b-collapse>
        <copy-edition-modal v-model="copyModalVisible" />
    </div>
</template>

<script lang="ts">
import { Component, Prop, Vue, toNative } from 'vue-facing-decorator';
import { EditionInfo } from '@/models/edition';
import EditionIcons from '@/components/cues/edition-icons.vue';
import Waiting from '@/components/misc/Waiting.vue';
import EditionCard from './edition-card.vue';
import CopyEditionModal from './copy-edition-modal.vue';

@Component({
    name: 'editions-list',
    components: {
        Waiting,
        EditionCard,
        // CopyPersonalEditionModal
        CopyEditionModal,
    },
})
class EditionsList extends Vue {
    @Prop() public title!: string;
    @Prop() public editions!: EditionInfo[];

    public copyModalVisible: boolean = false;

    public openCopyEditionModal(edition: EditionInfo) {
        this.$state.editions.current = edition;
        this.copyModalVisible = true;
    }
}
export default toNative(EditionsList);
</script>

<style  lang="scss" scoped>
@import '@/assets/styles/_variables.scss';
@import '@/assets/styles/_fonts.scss';

.collapsed .toggle-icon {
    transform: rotate(-90deg);
}

.toggle-icon {
    color: $blue;
    margin-left: 5px;
}

p:focus {
    outline: 0;
}

.after-login {
    display: grid;
    grid-gap: 10px;
    grid-template-columns: repeat(4, 0.25fr);
}
</style>
