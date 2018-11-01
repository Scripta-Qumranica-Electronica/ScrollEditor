<template>
  <div id="app">
    <navbar></navbar>
    <div class="container-fluid">
      <router-view></router-view>
      <p>Something</p>
    </div>
  </div>
</template>

<script>
import Navbar from '@/views/Navbar.vue';

export default {
  name: 'app',
  components: {
    Navbar,
  },
};
</script>

<style>
</style>
