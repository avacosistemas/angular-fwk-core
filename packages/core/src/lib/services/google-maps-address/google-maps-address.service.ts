import { Injectable, Inject, Optional } from '@angular/core';
import { Observable, from, of, defer } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { FWK_CONFIG, FwkConfig } from '../../model/fwk-config';

export interface GoogleNormalizedAddress {
  placeId: string;
  displayName: string;
  calle: string;
  altura: string;
  localidad: string;
  provincia: string;
  codigoPostal: string;
  lat?: number;
  lng?: number;
  types?: string[];
  hasStreetNumber?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class GoogleMapsAddressService {
  private googleMapsScriptLoadingPromise: Promise<void> | null = null;

  constructor(
    @Optional() @Inject(FWK_CONFIG) private fwkConfig?: FwkConfig
  ) {}

  public loadGoogleMapsApi(customApiKey?: string): Promise<void> {
    const apiKey = customApiKey || this.fwkConfig?.googleMapsApiKey;
    if (!apiKey) {
      return Promise.reject(new Error('Google Maps API Key no configurada.'));
    }

    if (typeof window !== 'undefined' && (window as any).google && (window as any).google.maps) {
      return Promise.resolve();
    }

    if (this.googleMapsScriptLoadingPromise) {
      return this.googleMapsScriptLoadingPromise;
    }

    this.googleMapsScriptLoadingPromise = new Promise((resolve, reject) => {
      const existingScript = document.querySelector('script[src*="maps.googleapis.com/maps/api/js"]');
      if (existingScript) {
        existingScript.addEventListener('load', () => resolve());
        existingScript.addEventListener('error', (e) => reject(e));
        return;
      }

      const script = document.createElement('script');
      script.type = 'text/javascript';
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&language=es&region=AR`;
      script.async = true;
      script.defer = true;
      script.onload = () => resolve();
      script.onerror = (err) => {
        this.googleMapsScriptLoadingPromise = null;
        reject(err);
      };
      document.head.appendChild(script);
    });

    return this.googleMapsScriptLoadingPromise;
  }

  public validateAddress(
    provincia: string,
    localidad: string,
    calle: string,
    altura: string,
    apiKey?: string
  ): Observable<GoogleNormalizedAddress[]> {
    return defer(() => from(this.loadGoogleMapsApi(apiKey))).pipe(
      map(() => {
        return { provincia, localidad, calle, altura };
      }),
      catchError(err => {
        console.error('Error loading Google Maps API:', err);
        throw err;
      }),
      map(params => params),
      map(() => null as any)
    );
  }

  public geocodeAddress(
    provincia: string,
    localidad: string,
    calle: string,
    altura: string,
    apiKey?: string
  ): Observable<GoogleNormalizedAddress[]> {
    return defer(async () => {
      await this.loadGoogleMapsApi(apiKey);
      const google = (window as any).google;
      if (!google || !google.maps || !google.maps.Geocoder) {
        throw new Error('Google Maps Geocoder no disponible.');
      }

      const geocoder = new google.maps.Geocoder();
      const addressQuery = `${calle.trim()} ${altura.trim()}, ${localidad.trim()}, ${provincia.trim()}, Argentina`;

      const geocodeRequest = {
        address: addressQuery,
        componentRestrictions: {
          country: 'AR'
        }
      };

      const result = await new Promise<{ results: any[]; status: any }>((resolve) => {
        geocoder.geocode(geocodeRequest, (results: any[], status: any) => {
          resolve({ results, status });
        });
      });

      if (result.status !== google.maps.GeocoderStatus.OK || !result.results || result.results.length === 0) {
        return [];
      }

      const parsedList: GoogleNormalizedAddress[] = [];

      for (const res of result.results) {
        const parsed = this.parseGeocoderResult(res, provincia, localidad, calle, altura);
        if (parsed) {
          parsedList.push(parsed);
        }
      }

      return parsedList;
    }).pipe(
      catchError(err => {
        console.error('Error executing Google Geocoding:', err);
        return of([]);
      })
    );
  }

  private parseGeocoderResult(
    result: any,
    inputProvincia: string,
    inputLocalidad: string,
    inputCalle: string,
    inputAltura: string
  ): GoogleNormalizedAddress | null {
    const components: any[] = result.address_components || [];

    let streetNumber = '';
    let route = '';
    let locality = '';
    let sublocality = '';
    let adminAreaLevel1 = '';
    let adminAreaLevel2 = '';
    let postalCode = '';

    for (const c of components) {
      const types: string[] = c.types || [];
      if (types.includes('street_number')) {
        streetNumber = c.long_name;
      } else if (types.includes('route')) {
        route = c.long_name;
      } else if (types.includes('locality')) {
        locality = c.long_name;
      } else if (types.includes('sublocality') || types.includes('sublocality_level_1')) {
        sublocality = c.long_name;
      } else if (types.includes('administrative_area_level_2')) {
        adminAreaLevel2 = c.long_name;
      } else if (types.includes('administrative_area_level_1')) {
        adminAreaLevel1 = c.long_name;
      } else if (types.includes('postal_code')) {
        postalCode = c.long_name;
      }
    }

    const types: string[] = result.types || [];
    const locationType = result.geometry?.location_type;

    const hasRoute = !!route;
    const hasStreetNumber = !!streetNumber;

    const finalCalle = route || inputCalle;
    const finalAltura = streetNumber || inputAltura;
    const finalLocalidad = locality || sublocality || adminAreaLevel2 || inputLocalidad;
    const matchedProvincia = this.normalizeProvincia(adminAreaLevel1 || inputProvincia);
    const finalProvincia = matchedProvincia || inputProvincia;

    const lat = result.geometry?.location?.lat ? result.geometry.location.lat() : undefined;
    const lng = result.geometry?.location?.lng ? result.geometry.location.lng() : undefined;

    return {
      placeId: result.place_id,
      displayName: result.formatted_address,
      calle: finalCalle,
      altura: finalAltura,
      localidad: finalLocalidad,
      provincia: finalProvincia,
      codigoPostal: postalCode,
      lat,
      lng,
      types,
      hasStreetNumber
    };
  }

  private normalizeProvincia(rawProvincia: string): string {
    if (!rawProvincia) return '';
    const clean = rawProvincia
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();

    if (
      clean.includes('buenos aires') &&
      !clean.includes('ciudad') &&
      !clean.includes('caba') &&
      !clean.includes('autonoma') &&
      !clean.includes('capital federal')
    ) {
      return 'Buenos Aires';
    }

    if (
      clean.includes('ciudad autonoma') ||
      clean.includes('capital federal') ||
      clean === 'caba' ||
      clean.includes('autonomous city of buenos aires')
    ) {
      return 'Ciudad Autónoma de Buenos Aires';
    }

    if (clean.includes('catamarca')) return 'Catamarca';
    if (clean.includes('chaco')) return 'Chaco';
    if (clean.includes('chubut')) return 'Chubut';
    if (clean.includes('cordoba')) return 'Córdoba';
    if (clean.includes('corrientes')) return 'Corrientes';
    if (clean.includes('entre rios')) return 'Entre Ríos';
    if (clean.includes('formosa')) return 'Formosa';
    if (clean.includes('jujuy')) return 'Jujuy';
    if (clean.includes('la pampa')) return 'La Pampa';
    if (clean.includes('la rioja')) return 'La Rioja';
    if (clean.includes('mendoza')) return 'Mendoza';
    if (clean.includes('misiones')) return 'Misiones';
    if (clean.includes('neuquen')) return 'Neuquén';
    if (clean.includes('rio negro')) return 'Río Negro';
    if (clean.includes('salta')) return 'Salta';
    if (clean.includes('san juan')) return 'San Juan';
    if (clean.includes('san luis')) return 'San Luis';
    if (clean.includes('santa cruz')) return 'Santa Cruz';
    if (clean.includes('santa fe')) return 'Santa Fe';
    if (clean.includes('santiago del estero')) return 'Santiago del Estero';
    if (clean.includes('tierra del fuego')) return 'Tierra del Fuego';
    if (clean.includes('tucuman')) return 'Tucumán';

    return rawProvincia;
  }
}
