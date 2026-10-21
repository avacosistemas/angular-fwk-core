import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

export interface OsmAddressItem {
  place_id: number | string;
  display_name: string;
  lat: string;
  lon: string;
  address: {
    road?: string;
    pedestrian?: string;
    street?: string;
    house_number?: string;
    city?: string;
    town?: string;
    village?: string;
    municipality?: string;
    suburb?: string;
    quarter?: string;
    state?: string;
    postcode?: string;
    country?: string;
    [key: string]: any;
  };
}

export interface NormalizedAddress {
  placeId: string;
  displayName: string;
  calle: string;
  altura: string;
  localidad: string;
  codigoPostal: string;
  lat: string;
  lon: string;
}

@Injectable({
  providedIn: 'root'
})
export class OsmAddressService {
  private readonly apiUrl = 'https://nominatim.openstreetmap.org/search';

  constructor(private http: HttpClient) {}

  searchAddress(calle: string, altura: string, localidad: string, codigoPostal?: string): Observable<NormalizedAddress[]> {
    if (!calle || !localidad) {
      return of([]);
    }

    const streetQuery = `${calle.trim()} ${altura ? altura.trim() : ''}`.trim();
    let params = new HttpParams()
      .set('format', 'json')
      .set('addressdetails', '1')
      .set('countrycodes', 'ar')
      .set('street', streetQuery)
      .set('city', localidad.trim());

    if (codigoPostal && codigoPostal.trim()) {
      params = params.set('postalcode', codigoPostal.trim());
    }

    return this.http.get<OsmAddressItem[]>(this.apiUrl, {
      params,
      headers: {
        'Accept-Language': 'es'
      }
    }).pipe(
      map(results => {
        if (!results || !results.length) {
          return [];
        }
        return results.map(item => this.normalizeItem(item, calle, altura, localidad, codigoPostal));
      }),
      catchError(err => {
        console.error('Error querying Nominatim OSM:', err);
        return of([]);
      })
    );
  }

  searchFreeForm(query: string): Observable<NormalizedAddress[]> {
    if (!query || !query.trim()) {
      return of([]);
    }

    const params = new HttpParams()
      .set('format', 'json')
      .set('addressdetails', '1')
      .set('countrycodes', 'ar')
      .set('q', query.trim());

    return this.http.get<OsmAddressItem[]>(this.apiUrl, {
      params,
      headers: {
        'Accept-Language': 'es'
      }
    }).pipe(
      map(results => {
        if (!results || !results.length) {
          return [];
        }
        return results.map(item => this.normalizeItem(item));
      }),
      catchError(err => {
        console.error('Error querying Nominatim OSM free-form:', err);
        return of([]);
      })
    );
  }

  private normalizeItem(
    item: OsmAddressItem,
    inputCalle?: string,
    inputAltura?: string,
    inputLocalidad?: string,
    inputCP?: string
  ): NormalizedAddress {
    const addr = item.address || {};
    
    const osmCalle = addr.road || addr.pedestrian || addr.street || inputCalle || '';
    
    const osmAltura = addr.house_number || inputAltura || '';

    let osmLocalidad = '';

    const isCABA = addr.state === 'Ciudad Autónoma de Buenos Aires' ||
                   addr['ISO3166-2-lvl4'] === 'AR-C' ||
                   (addr.state_district && addr.state_district.toLowerCase().startsWith('comuna')) ||
                   (addr.city && addr.city.toLowerCase() === 'buenos aires');

    if (isCABA) {
      osmLocalidad = 'Ciudad Autónoma de Buenos Aires';
    } else {
      let district = addr.state_district || addr.county || '';
      if (district.toLowerCase().startsWith('comuna')) {
        district = '';
      }

      osmLocalidad = district || addr.city || addr.town || addr.municipality || addr.village || addr.suburb || addr.state || inputLocalidad || '';
    }

    const osmCP = addr.postcode || inputCP || '';

    return {
      placeId: String(item.place_id),
      displayName: item.display_name,
      calle: osmCalle,
      altura: osmAltura,
      localidad: osmLocalidad,
      codigoPostal: osmCP,
      lat: item.lat,
      lon: item.lon
    };
  }
}
