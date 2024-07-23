<script setup lang="ts">
import {RouterView} from 'vue-router'
import * as echarts from "echarts";
import {provide} from "vue";

provide("echarts", echarts)
</script>

<template>
  <RouterView/>
</template>
