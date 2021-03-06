<template>
  <v-app>
    <v-navigation-drawer v-model="drawer" permanent absolute>
      <v-list>
        <v-list-tile avatar>
          <span class="app-logo">
            <img src="./assets/logo.svg" />
          </span>
          <v-list-tile-content>
            <v-list-tile-title
              class="font-weight-regular grey--text text--darken-2 app-title"
            >Disaster Watch</v-list-tile-title>
          </v-list-tile-content>
        </v-list-tile>
      </v-list>
      <v-list class="app-list" three-line>
        <v-list-tile v-if="tweets.length === 0">
          <v-list-tile-avatar class="app-search">
            <img src="./assets/search.gif" width="50" />
          </v-list-tile-avatar>
          <v-list-tile-content>
            <v-list-tile-title class="app-search-text">Waiting for tweets...</v-list-tile-title>
          </v-list-tile-content>
        </v-list-tile>
        <template v-for="tweet in tweets">
          <v-card :id="tweet.properties.id" :key="tweet.index" class="elevation-0">
            <v-img
              v-if="tweet.properties.image !== null"
              :src="tweet.properties.image"
              aspect-ratio="2.75"
            ></v-img>
            <v-card-title primary-title>
              <div>
                <h3 class="headline mb-0 text-capitalize" v-html="tweet.properties.category"></h3>
                <div
                  class="caption grey--text text--darken-2"
                >{{ new Date(tweet.properties.time).toString() }}</div>
                <div v-linkified>{{ tweet.properties.text }}</div>
              </div>
            </v-card-title>
            <v-card-actions class="pa-3">
              <v-btn icon @click="zoomToLocation(tweet.geometry.coordinates)">
                <v-icon color="red">place</v-icon>
              </v-btn>
              {{ tweet.properties.placeName }}
              <v-spacer></v-spacer>
              Confidence: {{ Math.round(tweet.properties.score * 10000) / 100 }}%
            </v-card-actions>
          </v-card>
          <v-divider :key="tweet.index"></v-divider>
        </template>
      </v-list>
    </v-navigation-drawer>
    <v-content>
      <v-container fluid>
        <div id="map"></div>
        <v-card class="app-map-legend">
          <div>
            <i class="app-map-legend-item" style="background: #1b9e77"></i>Earthquake
          </div>
          <div>
            <i class="app-map-legend-item" style="background: #d95f02"></i>Flood
          </div>
          <div>
            <i class="app-map-legend-item" style="background: #7570b3"></i>Explosion
          </div>
          <div>
            <i class="app-map-legend-item" style="background: #e7298a"></i>Hurricane
          </div>
          <div>
            <i class="app-map-legend-item" style="background: #66a61e"></i>Tornado
          </div>
          <div>
            <i class="app-map-legend-item" style="background: #e6ab02"></i>Bombing
          </div>
          <div>
            <i class="app-map-legend-item" style="background: #a6761d"></i>Wildfire
          </div>
        </v-card>
      </v-container>
    </v-content>
  </v-app>
</template>

<script>
import ndjsonStream from "can-ndjson-stream";
import mapboxgl from "mapbox-gl";

export default {
  name: "app",
  data() {
    return {
      drawer: true,
      tweets: [],
      recentTweet: null,
      map: null
    };
  },
  mounted() {
    fetch("https://dwapi.townshipcanada.com/api")
      .then(response => {
        return ndjsonStream(response.body);
      })
      .then(stream => {
        const reader = stream.getReader();
        let read;
        reader.read().then(
          (read = result => {
            if (result.done) {
              return;
            }
            reader.read().then(read);
            let geojson = {
              type: "Feature",
              geometry: {
                type: "Point",
                coordinates: result.value.location
              },
              properties: {
                id: result.value.id,
                category: result.value.category,
                time: result.value.time,
                text: result.value.text,
                image: result.value.image,
                score: result.value.score,
                placeName: result.value.placeName
              }
            };
            this.recentTweet = geojson;
            this.tweets.push(geojson);
          })
        );
      });
    mapboxgl.accessToken =
      "pk.eyJ1IjoibWVwYTEzNjMiLCJhIjoiY2pzenBhMHFsMWRrazN5b2R3eGJnM2tnbCJ9.23p1aP2I59DPZ1WNFtpxVA";
    const map = new mapboxgl.Map({
      container: "map",
      center: [40.2, 30.5],
      zoom: 1.5,
      maxZoom: 17,
      style: "mapbox://styles/mapbox/light-v10",
      hash: true
    });
    map.addControl(
      new mapboxgl.ScaleControl({
        maxWidth: 80
      })
    );
    map.on("load", () => {
      map.addSource("tweets", {
        type: "geojson",
        data: {
          type: "Feature",
          geometry: {
            type: "Point",
            coordinates: [0, 0]
          },
          properties: {
            id: 0,
            category: "null"
          }
        }
      });
      map.addLayer({
        id: "tweets",
        type: "circle",
        source: "tweets",
        paint: {
          "circle-radius": {
            base: 6,
            stops: [[12, 6], [22, 180]]
          },
          "circle-color": [
            "match",
            ["get", "category"],
            "earthquake",
            "#1b9e77",
            "floods",
            "#d95f02",
            "explosion",
            "#7570b3",
            "hurricane",
            "#e7298a",
            "tornado",
            "#66a61e",
            "bombing",
            "#e6ab02",
            "wildfires",
            "#a6761d",
            "#ccc"
          ]
        }
      });
    });
    this.map = map;
  },
  methods: {
    zoomToLocation(location) {
      this.map.flyTo({ center: location, zoom: 9 });
    }
  },
  watch: {
    recentTweet() {
      this.map.getSource("tweets").setData({
        type: "FeatureCollection",
        features: this.tweets
      });
      this.map.on("click", "tweets", e => {
        const id = e.features[0].properties.id;
        document.getElementById(`${id}`).scrollIntoView({
          behavior: "smooth",
          block: "center"
        });
        document.getElementById(`${id}`).style.border = "2px solid #ff4081";
        setTimeout(() => {
          document.getElementById(`${id}`).style.border = "none";
        }, 3000);
      });
      this.map.on("mouseenter", "tweets", () => {
        this.map.getCanvas().style.cursor = "pointer";
      });

      this.map.on("mouseleave", "tweets", () => {
        this.map.getCanvas().style.cursor = "";
      });
    }
  }
};
</script>

<style>
@import "../node_modules/mapbox-gl/dist/mapbox-gl.css";
html,
body,
#map {
  height: 100%;
  margin: 0px;
}
#map {
  position: absolute;
  left: 300px;
  top: 0;
  bottom: 0;
  width: 100%;
  height: 100%;
}

.headline {
  font-size: 20px !important;
}

.app-map-legend {
  position: absolute;
  z-index: 1002;
  bottom: 20px;
  right: 10px;
  width: 120px;
  padding: 10px;
  flex-direction: row;
  border-radius: 5px;
}
.app-map-legend-item {
  width: 15px;
  height: 15px;
  float: left;
  border-radius: 15px;
  margin: 0 5px auto;
}

.app-list {
  display: flex;
  flex-direction: column-reverse;
}

.app-logo img {
  width: 50px !important;
  padding: 0 10px;
}
.app-title {
  font-size: 16px;
}
.app-search img {
  width: 50px;
  height: 50px;
}
.app-search-text {
  margin-bottom: 15px;
  color: grey;
  font-weight: 400;
}
</style>
