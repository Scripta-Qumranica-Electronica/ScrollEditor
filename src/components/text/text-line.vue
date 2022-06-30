<template>
    <div class="text-line" :dir="direction">
        <span
            class="line-name"
            :id="'popover-line-' + line.lineId"
            @contextmenu="openLineMenu($event, 'popover-line-' + line.lineId)"
            >{{ line.lineName }}</span
        >
        <div
            :contenteditable="isEditMode"
            class="line-container"
            @input="lineChange($event)"
            @keydown.enter="checkEnter($event)"
            @paste="onPaste($event)"
            tabindex="-1"
        >
            <template v-for="sign in line.signs">
                <text-sign
                    :tabindex="
                        +sign.signInterpretations[0].signInterpretationId
                    "
                    :withMenu="true"
                    :id="
                        'popover-si-' +
                        sign.signInterpretations[0].signInterpretationId
                    "
                    :key="sign.signInterpretations[0].signInterpretationId"
                    :sign="sign"
                ></text-sign>
                <span
                    :tabindex="
                        +sign.signInterpretations[0].signInterpretationId
                    "
                    class="edited"
                    :key="
                        'edited-' +
                        sign.signInterpretations[0].signInterpretationId
                    "
                ></span>
            </template>
        </div>

        <b-popover
            custom-class="popover-sign-body"
            :target="'popover-line-' + line.lineId"
            triggers=""
            @shown="focusPopover()"
        >
            <div
                class="character-popover"
                tabindex="-1"
                ref="lineMenu"
                @blur="closeLineMenu()"
            >
                <ul>
                    <li>
                        <p @click="openEditLineModal(line)">
                            {{ $t('misc.editLine') }}
                        </p>
                    </li>
                    <li>
                        <p @click="showVariants()">Show Variant Editions</p>
                    </li>
                    <li>
                        <p @click="showParallels()">Show QWB Parallels</p>
                    </li>
                </ul>
            </div>
        </b-popover>

        <b-modal
            :id="`parallel-line-${line.lineId}`"
            hide-footer
            title="Parallel Texts from QWB"
        >
            <b class="line-name">Line {{ line.lineName }}</b>
            <div class="text-line" :dir="direction">
                <text-sign
                    :withMenu="true"
                    :id="
                        'popover-si-' +
                        sign.signInterpretations[0].signInterpretationId
                    "
                    v-for="sign in line.signs"
                    :key="sign.signInterpretations[0].signInterpretationId"
                    :sign="sign"
                ></text-sign>
            </div>
            <hr />
            <div v-if="parallels !== null && parallels.parallels.length > 0">
                <div v-for="parallel in parallels.parallels">
                    <b>{{ parallel.qwbTextReference }}</b>
                    <p>
                        <span
                            v-for="word in parallel.parallelWords"
                            class="qwb-parallel-word"
                            >{{ word.word }}</span
                        >
                    </p>
                </div>
            </div>
            <div v-if="parallels === null || parallels.parallels.length === 0">
                <p>No parallel text found in the QWB database.</p>
            </div>
        </b-modal>

        <b-modal
            :id="`variant-line-${line.lineId}`"
            hide-footer
            title="Variant Edition Transcriptions"
        >
            <b class="line-name">Line {{ line.lineName }}</b>
            <div class="text-line" :dir="direction">
                <text-sign
                    :withMenu="true"
                    :id="
                        'popover-si-' +
                        sign.signInterpretations[0].signInterpretationId
                    "
                    v-for="sign in line.signs"
                    :key="sign.signInterpretations[0].signInterpretationId"
                    :sign="sign"
                ></text-sign>
            </div>
            <hr />
            <div v-if="variants.length > 0">
                <div v-for="variant in variants">
                    <b>{{ variant.name }}, Line {{ variant.lineName }}</b>
                    <div :dir="direction">
                        <text-sign
                            :withMenu="false"
                            v-for="sign in variant.signs"
                            :key="`ed-${variant.editionId}-line-${sign.signInterpretations[0].signInterpretationId}`"
                            :sign="sign"
                        >
                            ></text-sign
                        >
                    </div>
                </div>
            </div>
            <div v-if="variants.length === 0">
                <p>There are no other editions of this manuscript.</p>
            </div>
        </b-modal>
    </div>
</template>

<script lang="ts">
import { Component, Emit, Prop, Vue } from 'vue-property-decorator';
import { Line, TextDirection } from '@/models/text';
import TextSign from '@/components/text/text-sign.vue';
import {
    EditorDTO,
    LineDTO,
    QwbParallelListDTO,
    LineTextDTO,
    SignDTO,
} from '@/dtos/sqe-dtos';
import QwbProxyService from '@/services/qwb-proxy';
import EditionService from '@/services/edition';
import TextService from '@/services/text';

@Component({
    name: 'text-line',
    components: {
        'text-sign': TextSign,
    },
})
export default class TextLineComponent extends Vue {
    @Prop() public isEditMode!: boolean;
    @Prop() public line!: Line;
    @Prop({
        default: 'rtl',
    })
    public direction!: TextDirection;
    private parallels: QwbParallelListDTO | null = null;
    private variants: DetailedLineTextDTO[] = [];
    private prevLineMenuId: string = '';
    private get editionId() {
        return parseInt(this.$route.params.editionId);
    }
    private async showParallels() {
        this.closeLineMenu();
        this.$bvModal.show(`parallel-line-${this.line.lineId}`);
        if (this.parallels === null) {
            const qwbWordIds = this.line.signs.flatMap((x) =>
                x.signInterpretations.flatMap((y) => y.qwbWordIds)
            );
            if (qwbWordIds.length > 0) {
                const qwbStartId = qwbWordIds[0];
                const qwbEndId = qwbWordIds[qwbWordIds.length - 1];
                if (
                    qwbStartId !== qwbEndId &&
                    qwbStartId !== 0 &&
                    qwbEndId !== 0
                ) {
                    const qps = new QwbProxyService();
                    this.parallels = await qps.getQwbParallelText(
                        qwbStartId,
                        qwbEndId
                    );
                }
            }
        }
    }

    @Emit()
    private lineChange(event: any) {
        return event.target.textContent;
    }

    private checkEnter(event: any) {
        event.preventDefault();
        event.currentTarget.blur();
    }
    private openEditLineModal(line: Line) {
        this.$state.textFragmentEditor.selectSign(line.signs[0].signInterpretations[0]);
        this.$root.$emit('bv::show::modal', 'editLineModal');
    }

    private onPaste(event: any) {
        const paste = (event.clipboardData || window.ClipboardItem).getData(
            'text'
        );
        const selection = window.getSelection();
        if (selection) {
            if (!selection.rangeCount) {
                return false;
            }
            selection.deleteFromDocument();
            selection.getRangeAt(0).insertNode(document.createTextNode(paste));
        }

        event.preventDefault();
    }

    private async showVariants() {
        this.closeLineMenu();
        this.$bvModal.show(`variant-line-${this.line.lineId}`);
        if (this.variants.length === 0) {
            const es = new EditionService();
            const currentEdition = await es.getSingleEditions(this.editionId);
            const variantEditionList = await es.getManuscriptEditions(
                currentEdition.primary.manuscriptId
            );
            const variantEditions = variantEditionList.editions.flatMap(
                (x) => x[0]
            );
            const ts = new TextService();
            for (const variantEdition of variantEditions) {
                if (variantEdition.id !== this.editionId) {
                    try {
                        const line = (await ts.getLineText(
                            variantEdition.id,
                            this.line.lineId
                        )) as DetailedLineTextDTO;
                        line.editionId = variantEdition.id;
                        line.name = variantEdition.name;
                        this.variants.push(line);
                    } catch {
                        this.variants.push({
                            editionId: variantEdition.id,
                            name: variantEdition.name,
                            licence: variantEdition.copyright,
                            editors: {} as { [key: string]: EditorDTO },
                            lineId: this.line.lineId,
                            lineName: 'NA',
                            editorId: 0,
                            signs: [],
                        } as DetailedLineTextDTO);
                    }
                }
            }
        }
    }
    private openLineMenu(event: MouseEvent, lineMenuId: string) {
        if (this.isEditMode) {
            return;
        }
        // prevent usual menu to display
        event.preventDefault();
        this.$root.$emit('bv::show::popover', lineMenuId);
        this.prevLineMenuId = lineMenuId;
    }
    private closeLineMenu() {
        this.$root.$emit('bv::hide::popover', this.prevLineMenuId);
    }
    private focusPopover() {
        (this.$refs.lineMenu as any).focus();
    }
}
interface DetailedLineTextDTO extends LineTextDTO {
    name: string;
    editionId: number;
}
</script>
<style lang="scss" scoped>
@import '@/assets/styles/_variables.scss';

div.text-line {
    display: table;
    text-align: right;
    white-space: nowrap;
    margin-left: 8px;
    margin-right: 8px;
}

span.line-name {
    padding-left: 10px;
    cursor: pointer;
}

span.qwb-parallel-word {
    margin-right: 0.5em;
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
</style>