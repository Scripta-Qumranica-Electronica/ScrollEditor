/*
 * This class is a base class for a mixin that has an async mounted method.
 *
 * The problem with async mounted() methods is that while they are called in order (mixins before component), they
 * finish in an unexpected order. If your component's mounted() function depends on the mixin's mounted function to
 * finish, it needs some help.
 *
 * To use this, in your mixin implement asyncMounted instead of mounted, and in your component
 * await this.mountedDone in your mounted method.
 */

import { Component, Prop, Vue } from 'vue-property-decorator';

@Component
export default class AsyncMountedMixinBase extends Vue {
    protected mountedDone!: Promise<void>;

    protected mounted() {
        this.mountedDone = this.asyncMounted();
    }

    // tslint:disable-next-line:no-empty
    protected async asyncMounted(): Promise<void> {
    }
}
