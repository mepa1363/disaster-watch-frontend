import Vue from "vue";
import "./plugins/vuetify";
import App from "./App.vue";
import linkify from "vue-linkify";

Vue.directive("linkified", linkify);

Vue.config.productionTip = false;

new Vue({
  render: h => h(App)
}).$mount("#app");
