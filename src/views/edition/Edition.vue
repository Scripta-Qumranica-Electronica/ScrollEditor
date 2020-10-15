<template>
    <div>
        <div>
            <span>
            Rule of Blessings 1Q28 - 1Qsn
            </span>
            <div>
                <span>Collaborqtors</span>
                <span>Publish</span>
            </div>
        </div>
        <div v-if="!waiting">
            <p>Heqder</p>
            <div>
                <b-button-group>
                    <b-button :to="`/editions/${edition.id}/artefacts`">Artefacts {{artefactsLength}}</b-button>
                    <b-button :to="`/editions/${edition.id}/imaged-objects`">Imaged Objects {{imagedObjectsLength}}</b-button>
                </b-button-group>
            </div>
        </div>
        <div>
            <div v-if="!waiting" class="row">
                <div class="col" v-if="waiting"><waiting></waiting></div>
                <div class="col" v-if="!waiting">
                    <router-view></router-view>
                </div>
            </div>
        </div>

    </div>
</template>

<script lang="ts">
import Vue from 'vue';
import EditionSidebar from './components/sidebar.vue';
import { EditionInfo } from '@/models/edition.js';
import Waiting from '@/components/misc/Waiting.vue';

export default Vue.extend({
    name: 'edition-version',
    components: {
        EditionSidebar,
        Waiting,
    },
    data() {
        return {
            editionId: 0,
            page: '',
        };
    },
    computed: {
        edition(): EditionInfo | undefined {
            return this.$state.editions.current;
        },
        waiting(): boolean {
            return !this.edition;
        },
        artefactsLength(): number {
            return this.$state.artefacts.items.length;
        },
        imagedObjectsLength(): number {
            return this.$state.imagedObjects.items.length;
        }

        
    },
    mounted() {
        this.editionId = parseInt(this.$route.params.editionId, 10);
        this.$state.prepare.edition(this.editionId);
        this.getPage(window.location.href);
    },
    beforeRouteUpdate(to, from, next) {
        this.editionId = parseInt(to.params.editionId, 10);
        this.$state.prepare.edition(this.editionId);
        this.getPage(to.path);
        next();
    },
    methods: {
        getPage(url: string) {
            if (url.endsWith('artefacts')) {
                this.page = 'artefacts';
            } else {
                this.page = 'imaged-objects';
            }
        }
    },
});
</script>

<style lang="scss" scoped>
#sidebar {
  float: left;
}

#fragments {
  float: right;
}
</style>
