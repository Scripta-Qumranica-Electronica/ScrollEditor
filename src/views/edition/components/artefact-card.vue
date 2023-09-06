<template>
    <div id="card" ref="card"   v-b-tooltip.hover.right title="Rename this artefact">
        <router-link :to="{ path: `/editions/${editionId}/artefacts/${artefact.id}` }">
            <span class="line-name" :id="'popover-line-' + artefact.id"
                @contextmenu="openLineMenu($event, 'popover-line-' + artefact.id)">
                <artefact-image class="card-img-top" v-if="artefact && observed" :artefact="artefact"
                    maxWidth="150"></artefact-image></span>
            <img class="place-holder" v-if="artefact && !observed" src="@/assets/images/rings.svg" />
            <label class="side-edition">{{ artefact.name }} - {{ artefact.side }}</label>
            <b-popover custom-class="popover-sign-body" :target="'popover-line-' + artefact.id">
                <div class="character-popover"  ref="lineMenu">
                 <b>
                    Rename this artefact
                 </b>   
                    <input ref="newArtefactName" id="newName" v-model="newArtefactName" type="text" required
                        :placeholder="$t('home.newArtefactName')" />
                    <div>
                        <b-button @click="renameArtefact()" size="sm">
                            Rename 
                        </b-button>
                        <b-button @click="closeLineMenu()" size="sm">Close</b-button>
                    </div>

                </div>
            </b-popover>
        </router-link>
    </div>
</template>

<script lang="ts">
import { Component, Emit, Prop, Vue } from 'vue-property-decorator';
import ArtefactService from '@/services/artefact';
import { Artefact } from '@/models/artefact';
import ArtefactImage from '@/components/artefact/artefact-image.vue';

@Component({
    name: 'artefact-card',
    components: {
        ArtefactImage,
    }
})
export default class ArtefactCard extends Vue {
    @Prop() public readonly artefact!: Artefact;
    public newArtefactName: string = '';
    public observed = false;
    private prevLineMenuId: string = '';
    private intersectionObserver?: IntersectionObserver;
    private artefactService = new ArtefactService();

    public mounted() {
        this.intersectionObserver = new IntersectionObserver((entries) => this.onObserved(entries), {
            root: undefined,
            rootMargin: '0px',
            threshold: 0.1,
        });
        this.intersectionObserver.observe(this.$refs.card as Element);
        this.newArtefactName = this.artefact.name;
    }

    public async renameArtefact() {
        this.artefact.name = this.newArtefactName;
        await this.artefactService.changeArtefact(
            this.editionId,
            this.artefact
        );
        this.$root.$emit('bv::hide::popover', this.prevLineMenuId);

    }
    public closeLineMenu() {
        this.$root.$emit('bv::hide::popover', this.prevLineMenuId);
    }

    public openLineMenu(event: MouseEvent, artefactId: any) {
        event.preventDefault();
        this.$root.$emit('bv::show::popover', artefactId);
        this.prevLineMenuId = artefactId;
    }

    private onObserved(entries: IntersectionObserverEntry[]) {
        if (entries.length !== 1) {
            console.warn('Intersection handler received numerous entries, 1 expected', entries);
        }

        const entry = entries[0];
        if (!entry.isIntersecting) {
            return;
        }

        // We get here whether there is an intersection, or we've received the wrong number of entries. Either way,
        // we can load the image and stop observing.
        this.observed = true;

        this.intersectionObserver!.disconnect();
        this.intersectionObserver = undefined;
    }

    public get editionId(): number {
        return parseInt(this.$route.params.editionId);
    }

    public destroyed() {
        if (this.intersectionObserver) {
            this.intersectionObserver.disconnect();
            this.intersectionObserver = undefined;
        }
    }

}

</script>

<style lang="scss" scoped>
@import '@/assets/styles/_variables.scss';
@import '@/assets/styles/_fonts.scss';
div.card {
    margin-bottom: 20px;

    img {
        cursor: pointer;
    }
    .card-img-top svg {
        margin: 33px 33px 0px 33px;
        width: calc(92% - 33px);
    }
    .side-edition {
        width: 100%;
        text-align: center;
        font-style: $font-style;
        font-weight: $font-weight-3;
        font-size: $font-size-2;
        font-family: $font-family;
        color: $black;
    }
}

.character-popover {
    .sign-type-space:after {
        content: '˽';
    }

    ul {
        cursor: pointer;
        list-style-type: none;
        padding-left: 0px;

        &:focus,
        &:focus-visible {
            outline: unset;
        }

        li p {
            margin-bottom: 8px;
        }

        li p:hover {
            color: $blue;
        }
    }

    &:focus,
    &:focus-visible {
        outline: unset;
    }
}

img.place-holder {
    width: 100%;
}

div#card {
    min-height: 60px;
}

</style>
