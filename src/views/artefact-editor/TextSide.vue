<template>
    <div id="text-side" :class="{ 'fixed-header': scrolled }">
        <input class="select-text" list="my-list-id" v-model="query" @change="search(query)" />
        <datalist id="my-list-id">
            <option :key="tf.textFragmentId" v-for="tf in textFragments">{{ tf.name }}</option>
        </datalist>
        <button @click.prevent="load(query)" :disabled="loading" name="Load">Load</button>
        <span class="isa_error">{{errorMessage}}</span>

        <div v-if="textFragment">
            <text-fragment
                :clickedSignId="clickedSignId"
                :textFragment="textFragment"
                id="text-box"
            ></text-fragment>
        </div>
    </div>
</template>

<script lang="ts">
import Vue from 'vue';
import { Artefact } from '@/models/artefact';
import { TextFragmentData, TextFragment } from '@/models/text';
import TextFragmentComponent from '@/components/text/TextFragment.vue';

export default Vue.extend({
    name: 'text-side',
    components: {
        'text-fragment': TextFragmentComponent
    },
    data() {
        return {
            errorMessage: '',
            query: '',
            textFragmentId: 0,
            loading: false,
        };
    },
    props: {
        artefact: Object as () => Artefact,
        clickedSignId: Number,
    },
    computed: {
        editionId(): number {
            return parseInt(this.$route.params.editionId);
        },
        scrolled(): boolean {
            return true;
        },
        textFragments(): TextFragmentData[] {
            return this.$state.editions.current!.textFragments || [];
        },
        textFragment(): TextFragment | undefined {
            return this.$state.textFragments.current;
        }
    },
    async mounted() {
        this.$state.prepare.edition(this.editionId);
    },
    methods: {
        load() {
            this.errorMessage = '';
            const textFragment = this.textFragments.find(
               (obj) => obj.name === this.query
            );
            if (this.query) {
                if (!textFragment) {
                    this.errorMessage = 'This fragment does not exist';
                    return;
                }
                this.textFragmentId = textFragment.id;
                this.getFragmentText();
            }
        },
        async getFragmentText() {
            this.loading = true;
            await this.$state.prepare.textFragment(this.editionId, this.textFragmentId);
            this.loading = false;
        }
    }
});
</script>

<style lang="scss" scoped>
#text-side {
    margin: 20px 50px 20px 30px;
    touch-action: pan-y;
    // top: 0;
    // right: 0;
}

button {
    margin-right: 10px;
}
.btn-info {
    background-color: #6c757d;
    border-color: #6c757d;
}

#text-box {
    margin-top: 30px;
}

.isa_error {
    color: #d8000c;
}
</style>
