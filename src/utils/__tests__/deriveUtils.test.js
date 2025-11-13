import { deriveBuildingOrder } from '../deriveUtils';

describe('deriveUtils', () => {
  describe('deriveBuildingOrder', () => {
    const userStart = { lat: 37.7749, lng: -122.4194 }; // San Francisco

    it('should return empty route when no buildings provided', () => {
      const result = deriveBuildingOrder([], userStart);

      expect(result.start).toEqual(userStart);
      expect(result.route).toEqual([]);
      expect(result.legs).toEqual([]);
      expect(result.total_distance_km).toBe(0);
      expect(result.est_duration_min).toBe(0);
      expect(result.method).toBe('nearest-neighbor+2opt');
    });

    it('should return empty route when buildings is null', () => {
      const result = deriveBuildingOrder(null, userStart);

      expect(result.start).toEqual(userStart);
      expect(result.route).toEqual([]);
      expect(result.legs).toEqual([]);
      expect(result.total_distance_km).toBe(0);
    });

    it('should handle single building', () => {
      const buildings = [
        { id: 'b1', name: 'Building 1', lat: 37.7750, lng: -122.4195 }
      ];

      const result = deriveBuildingOrder(buildings, userStart);

      expect(result.route).toHaveLength(1);
      expect(result.route[0]).toEqual({
        order: 1,
        id: 'b1',
        name: 'Building 1',
        lat: 37.7750,
        lng: -122.4195
      });
      expect(result.legs).toHaveLength(1);
      expect(result.legs[0].from.id).toBe('__user__');
      expect(result.legs[0].to.id).toBe('b1');
      expect(result.total_distance_km).toBeGreaterThan(0);
    });

    it('should create route for multiple buildings', () => {
      const buildings = [
        { id: 'b1', lat: 37.7750, lng: -122.4195 },
        { id: 'b2', lat: 37.7760, lng: -122.4200 },
        { id: 'b3', lat: 37.7740, lng: -122.4180 }
      ];

      const result = deriveBuildingOrder(buildings, userStart);

      expect(result.route).toHaveLength(3);
      expect(result.route.every(b => b.order >= 1 && b.order <= 3)).toBe(true);
      expect(result.legs).toHaveLength(3); // user->b1, b1->b2, b2->b3
      expect(result.total_distance_km).toBeGreaterThan(0);
      expect(result.est_duration_min).toBeGreaterThan(0);
    });

    it('should start with nearest building to user', () => {
      const buildings = [
        { id: 'far', lat: 37.8000, lng: -122.5000 }, // ~10km away
        { id: 'near', lat: 37.7750, lng: -122.4195 }, // ~100m away
        { id: 'medium', lat: 37.7800, lng: -122.4300 } // ~1km away
      ];

      const result = deriveBuildingOrder(buildings, userStart);

      // First building in route should be the nearest one
      expect(result.route[0].id).toBe('near');
    });

    it('should calculate correct haversine distance', () => {
      // Known distance: San Francisco to Los Angeles is ~559 km
      const sf = { lat: 37.7749, lng: -122.4194 };
      const la = { lat: 34.0522, lng: -118.2437 };

      const buildings = [{ id: 'la', lat: la.lat, lng: la.lng }];
      const result = deriveBuildingOrder(buildings, sf);

      // Should be approximately 559 km (allowing for some variance)
      expect(result.total_distance_km).toBeGreaterThan(550);
      expect(result.total_distance_km).toBeLessThan(570);
    });

    it('should calculate estimated duration correctly', () => {
      const buildings = [
        { id: 'b1', lat: 37.7750, lng: -122.4195 } // ~0.1 km away
      ];

      // Default speed is 4.5 km/h
      const result = deriveBuildingOrder(buildings, userStart);

      // 0.1 km at 4.5 km/h should take about 1-2 minutes
      expect(result.est_duration_min).toBeGreaterThanOrEqual(0);
      expect(result.est_duration_min).toBeLessThan(10);
    });

    it('should respect custom speed option', () => {
      const buildings = [
        { id: 'b1', lat: 37.7800, lng: -122.4300 }
      ];

      const resultSlow = deriveBuildingOrder(buildings, userStart, { speedKmh: 2 });
      const resultFast = deriveBuildingOrder(buildings, userStart, { speedKmh: 8 });

      // Same distance at different speeds should yield different durations
      expect(resultSlow.est_duration_min).toBeGreaterThan(resultFast.est_duration_min);
    });

    it('should include all buildings in route', () => {
      const buildings = [
        { id: 'b1', lat: 37.7750, lng: -122.4195 },
        { id: 'b2', lat: 37.7760, lng: -122.4200 },
        { id: 'b3', lat: 37.7740, lng: -122.4180 },
        { id: 'b4', lat: 37.7730, lng: -122.4170 }
      ];

      const result = deriveBuildingOrder(buildings, userStart);

      const routeIds = result.route.map(b => b.id);
      buildings.forEach(b => {
        expect(routeIds).toContain(b.id);
      });
    });

    it('should preserve building properties in route', () => {
      const buildings = [
        { id: 'b1', name: 'Test Building', lat: 37.7750, lng: -122.4195, custom: 'data' }
      ];

      const result = deriveBuildingOrder(buildings, userStart);

      expect(result.route[0].name).toBe('Test Building');
      expect(result.route[0].custom).toBe('data');
    });

    it('should create correct legs structure', () => {
      const buildings = [
        { id: 'b1', lat: 37.7750, lng: -122.4195 },
        { id: 'b2', lat: 37.7760, lng: -122.4200 }
      ];

      const result = deriveBuildingOrder(buildings, userStart);

      // Should have user->b1, b1->b2
      expect(result.legs).toHaveLength(2);

      // First leg from user
      expect(result.legs[0].from.id).toBe('__user__');
      expect(result.legs[0].from.lat).toBe(userStart.lat);
      expect(result.legs[0].from.lng).toBe(userStart.lng);

      // Each leg should have distance
      result.legs.forEach(leg => {
        expect(leg.distance_km).toBeGreaterThan(0);
        expect(typeof leg.distance_km).toBe('number');
      });
    });

    it('should round distances to 2 decimal places', () => {
      const buildings = [
        { id: 'b1', lat: 37.7750, lng: -122.4195 }
      ];

      const result = deriveBuildingOrder(buildings, userStart);

      // Check that total distance has at most 2 decimal places
      const decimalPlaces = (result.total_distance_km.toString().split('.')[1] || '').length;
      expect(decimalPlaces).toBeLessThanOrEqual(2);

      // Check leg distances
      result.legs.forEach(leg => {
        const legDecimals = (leg.distance_km.toString().split('.')[1] || '').length;
        expect(legDecimals).toBeLessThanOrEqual(2);
      });
    });

    it('should optimize route with 2-opt for better efficiency', () => {
      // Create a scenario where nearest-neighbor is suboptimal
      // Place buildings in a cross pattern where greedy approach would be inefficient
      const buildings = [
        { id: 'north', lat: 37.7850, lng: -122.4194 },
        { id: 'south', lat: 37.7650, lng: -122.4194 },
        { id: 'east', lat: 37.7749, lng: -122.4094 },
        { id: 'west', lat: 37.7749, lng: -122.4294 }
      ];

      const result = deriveBuildingOrder(buildings, userStart);

      // Should have 4 buildings in route
      expect(result.route).toHaveLength(4);

      // Total distance should be reasonable (2-opt should prevent terrible routes)
      expect(result.total_distance_km).toBeGreaterThan(0);
    });

    it('should respect twoOptMaxSwaps option', () => {
      const buildings = Array.from({ length: 10 }, (_, i) => ({
        id: `b${i}`,
        lat: 37.7749 + (Math.random() - 0.5) * 0.1,
        lng: -122.4194 + (Math.random() - 0.5) * 0.1
      }));

      // Both should work, but with different swap limits
      const result1 = deriveBuildingOrder(buildings, userStart, { twoOptMaxSwaps: 10 });
      const result2 = deriveBuildingOrder(buildings, userStart, { twoOptMaxSwaps: 5000 });

      expect(result1.route).toHaveLength(10);
      expect(result2.route).toHaveLength(10);
    });

    it('should handle buildings at same location', () => {
      const buildings = [
        { id: 'b1', lat: 37.7750, lng: -122.4195 },
        { id: 'b2', lat: 37.7750, lng: -122.4195 } // same location
      ];

      const result = deriveBuildingOrder(buildings, userStart);

      expect(result.route).toHaveLength(2);
      expect(result.total_distance_km).toBeGreaterThanOrEqual(0);
    });

    it('should handle user starting at building location', () => {
      const buildingLocation = { lat: 37.7750, lng: -122.4195 };
      const buildings = [
        { id: 'b1', ...buildingLocation }
      ];

      const result = deriveBuildingOrder(buildings, buildingLocation);

      expect(result.route).toHaveLength(1);
      // Distance should be very close to 0
      expect(result.total_distance_km).toBeLessThan(0.001);
    });

    it('should maintain order numbers correctly', () => {
      const buildings = [
        { id: 'b1', lat: 37.7750, lng: -122.4195 },
        { id: 'b2', lat: 37.7760, lng: -122.4200 },
        { id: 'b3', lat: 37.7740, lng: -122.4180 }
      ];

      const result = deriveBuildingOrder(buildings, userStart);

      // Orders should be 1, 2, 3
      expect(result.route[0].order).toBe(1);
      expect(result.route[1].order).toBe(2);
      expect(result.route[2].order).toBe(3);
    });

    it('should calculate total distance as sum of all legs', () => {
      const buildings = [
        { id: 'b1', lat: 37.7750, lng: -122.4195 },
        { id: 'b2', lat: 37.7760, lng: -122.4200 }
      ];

      const result = deriveBuildingOrder(buildings, userStart);

      const sumOfLegs = result.legs.reduce((sum, leg) => sum + leg.distance_km, 0);

      // Should match total (accounting for rounding)
      expect(Math.abs(result.total_distance_km - sumOfLegs)).toBeLessThan(0.01);
    });
  });
});
