import { z } from 'zod';

import {
  adGuardApiFilteringStatusSchema,
  adGuardApiStatsResponseSchema,
  adGuardApiStatusResponseSchema,
} from './adGuard.schema';

export class AdGuard {
  constructor(
    private readonly hostname: string,
    private readonly username: string,
    private readonly password: string
  ) {}

  async getStats(): Promise<AdGuardStatsType> {
    return await this.getData("stats", adGuardApiStatsResponseSchema) as AdGuardStatsType;
  }

  async getStatus() {
    return await this.getData("status", adGuardApiStatusResponseSchema) as AdGuardStatusType;
  }

  async getCountFilteringDomains() {
    const schemaData = await this.getData("filtering/status", adGuardApiFilteringStatusSchema) as AdGuardDomainFiltersType;

    return schemaData.filters
      .filter((filter) => filter.enabled)
      .reduce((sum, filter) => filter.rules_count + sum, 0);
  }

  async disable() {
    await this.changeProtectionStatus(false);
  }
  async enable() {
    await this.changeProtectionStatus(true);
  }

  private async getData(type: string, schema: z.ZodObject<{}>) {
    const response = await fetch(new URL(`/control/${type}`, this.hostname), {
      method: 'GET',
      headers: {
        Authorization: `Basic ${this.getAuthorizationHeaderValue()}`,
      },
    });

    if (response.status !== 200) {
      throw new Error(`AdGuard ${type}; Status code does not indicate success: ${response.status}`);
    }

    const data = await response.json();

    return schema.parseAsync(data);
  }

  /**
   * Make a post request to the AdGuard API to change the protection status based on the value of newStatus
   * @param {boolean} newStatus - The new status of the protection
   * @param {number} duration - Duration of a pause, in milliseconds. Enabled should be false.
   * @returns {string} - The response from the AdGuard API
   */
  private async changeProtectionStatus(newStatus: boolean, duration = 0) {
    const response = await fetch(new URL(`/control/protection`, this.hostname), {
      method: 'POST',
      headers: {
        Authorization: `Basic ${this.getAuthorizationHeaderValue()}`,
      },
      body: JSON.stringify({
        enabled: newStatus,
        duration,
      }),
    });

    if (response.status !== 200) {
      throw new Error(`AdGuard Protection ${newStatus}; Status code does not indicate success: ${response.status}`);
    }

    return await response.json();
  }

  /**
   * It return a base64 username:password string
   * @returns {string} The base64 encoded username and password
   */
  private getAuthorizationHeaderValue() {
    return Buffer.from(`${this.username}:${this.password}`).toString('base64');
  }
}

export type AdGuardStatsType = z.infer<typeof adGuardApiStatsResponseSchema>;
export type AdGuardStatusType = z.infer<typeof adGuardApiStatusResponseSchema>;
export type AdGuardDomainFiltersType = z.infer<typeof adGuardApiFilteringStatusSchema>;
