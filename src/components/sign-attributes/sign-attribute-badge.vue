<template>
    <div class="sign-attribute">
        <span>
            <b-badge variant="secondary">{{attribute.attributeString}}: {{attribute.attributeValueString}}</b-badge>
        </span>
    </div>
</template>

<script lang="ts">
import { Component, Prop, Vue } from 'vue-property-decorator';
import { InterpretationAttributeDTO } from '@/dtos/sqe-dtos';

@Component({
    name: 'sign-attribute-badge',
})
export default class SignAttributeBadge extends Vue {
    @Prop()
    public attribute!: InterpretationAttributeDTO;
}
</script>

<style lang="scss" scoped>
.sign-attribute {
    cursor: default;
    display: inline;    
}
</style>
