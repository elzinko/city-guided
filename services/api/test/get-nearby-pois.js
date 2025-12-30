"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const in_memory_poi_repo_1 = require("../src/infrastructure/persistence/in-memory-poi-repo");
const get_nearby_pois_1 = require("../src/domain/use-cases/get-nearby-pois");
async function run() {
    const repo = new in_memory_poi_repo_1.InMemoryPoiRepository();
    const res = await (0, get_nearby_pois_1.getNearbyPois)(repo, { lat: 48.8570, lng: 2.3510, radiusMeters: 200 });
    console.log('Nearby POIs (within 200m):', res.map((r) => ({ id: r.id, name: r.name, d: Math.round(r.distanceMeters) })));
}
run().catch((e) => {
    console.error(e);
    process.exit(1);
});
