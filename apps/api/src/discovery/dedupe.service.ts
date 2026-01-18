import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';

@Injectable()
export class DedupeService {
    /**
     * Canonicalize a URL for deduplication purposes
     * - Lowercase scheme and host
     * - Remove tracking parameters (utm_*, fbclid, gclid, etc.)
     * - Remove fragments (#)
     * - Normalize trailing slashes
     * - Sort query parameters
     */
    canonicalizeUrl(url: string): string {
        try {
            const parsed = new URL(url);

            // Lowercase scheme and host
            parsed.protocol = parsed.protocol.toLowerCase();
            parsed.hostname = parsed.hostname.toLowerCase();

            // Remove fragments
            parsed.hash = '';

            // Remove tracking parameters
            const trackingParams = [
                'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
                'fbclid', 'gclid', 'msclkid', 'mc_cid', 'mc_eid',
                '_ga', '_gl', 'ref', 'source', 'campaign'
            ];

            trackingParams.forEach(param => {
                parsed.searchParams.delete(param);
            });

            // Sort remaining query parameters
            const sortedParams = new URLSearchParams();
            const entries = Array.from(parsed.searchParams.entries()).sort((a, b) =>
                a[0].localeCompare(b[0])
            );
            entries.forEach(([key, value]) => sortedParams.set(key, value));
            parsed.search = sortedParams.toString();

            // Normalize trailing slashes - remove trailing slash unless it's just "/"
            let result = parsed.toString();
            if (result.endsWith('/') && parsed.pathname !== '/') {
                result = result.slice(0, -1);
            }

            return result;
        } catch (error) {
            // If URL parsing fails, return original
            return url;
        }
    }

    /**
     * Normalize title for comparison
     * - Lowercase
     * - Remove extra whitespace
     * - Remove special characters
     */
    normalizeTitle(title: string): string {
        return title
            .toLowerCase()
            .replace(/[^\w\s]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    }

    /**
     * Compute SHA256 hash of a string
     */
    computeHash(content: string): string {
        return crypto.createHash('sha256').update(content).digest('hex');
    }

    /**
     * Get URL hash for deduplication
     */
    getUrlHash(url: string): string {
        const canonical = this.canonicalizeUrl(url);
        return this.computeHash(canonical);
    }

    /**
     * Get title hash for deduplication
     */
    getTitleHash(title: string): string {
        const normalized = this.normalizeTitle(title);
        return this.computeHash(normalized);
    }

    /**
     * Extract domain from URL
     */
    extractDomain(url: string): string {
        try {
            const parsed = new URL(url);
            return parsed.hostname;
        } catch {
            return 'unknown';
        }
    }
}
