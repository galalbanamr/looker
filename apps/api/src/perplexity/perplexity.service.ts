import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface SearchResult {
    title: string;
    url: string;
    snippet: string;
    source: string;
}

export interface StructuredItem {
    title: string;
    what_it_is: string;
    deadline: string | null;
    deadline_confidence: 'high' | 'medium' | 'low' | null;
    location: string | null;
    eligibility: string | null;
    link: string;
    source_domain: string;
    notes: string | null;
}

@Injectable()
export class PerplexityService {
    private readonly logger = new Logger(PerplexityService.name);
    private readonly apiKey: string;
    private readonly baseUrl = 'https://api.perplexity.ai';

    constructor(private config: ConfigService) {
        this.apiKey = this.config.get('PERPLEXITY_API_KEY') || '';
        if (!this.apiKey) {
            this.logger.warn('⚠️ PERPLEXITY_API_KEY not configured');
        }
    }

    /**
     * Search for competitions/events using Perplexity Search API
     */
    async searchCompetitions(query: string, location: string = 'Qatar', description?: string): Promise<SearchResult[]> {
        if (!this.apiKey) {
            this.logger.error('Perplexity API key not configured');
            return [];
        }

        const currentDate = new Date().toISOString().split('T')[0];
        const searchQuery = `${query} competitions events ${location} 2026`;

        try {
            const response = await fetch(`${this.baseUrl}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: 'sonar',
                    messages: [
                        {
                            role: 'system',
                            content: `You are a research assistant finding ACTIVE and UPCOMING competitions, hackathons, events, grants, and opportunities.

CRITICAL REQUIREMENTS:
- Today's date is ${currentDate}. Only include events with registration/applications STILL OPEN.
- Exclude any events that have already ended, passed, or have closed deadlines.
- Focus on events in or eligible for residents of: ${location}
${description ? `- Search context: ${description}` : ''}

Return results as JSON array with format: [{"title": "...", "url": "...", "snippet": "...", "source": "..."}]. 
Only include events that are DEFINITELY still accepting applications or registrations.`
                        },
                        {
                            role: 'user',
                            content: `Find ACTIVE and UPCOMING competitions, hackathons, and events matching: "${searchQuery}". 
IMPORTANT: Only include events that have NOT ended yet and are still accepting applications as of ${currentDate}.
${description ? `Additional context: ${description}` : ''}
Return up to 10 results with actual URLs.`
                        }
                    ],
                    max_tokens: 2000,
                    temperature: 0.1,
                    return_citations: true,
                }),
            });

            if (!response.ok) {
                const error = await response.text();
                this.logger.error(`Perplexity API error: ${response.status} - ${error}`);
                return [];
            }

            const data = await response.json();
            const content = data.choices?.[0]?.message?.content || '';

            // Parse JSON from response
            try {
                const jsonMatch = content.match(/\[[\s\S]*\]/);
                if (jsonMatch) {
                    const results = JSON.parse(jsonMatch[0]) as SearchResult[];
                    this.logger.log(`Found ${results.length} search results for "${query}"`);
                    return results;
                }
            } catch (parseError) {
                this.logger.warn('Failed to parse search results as JSON');
            }

            // Fallback: extract URLs from citations
            const citations = data.citations || [];
            return citations.map((url: string, i: number) => ({
                title: `Result ${i + 1}`,
                url,
                snippet: content.slice(0, 200),
                source: new URL(url).hostname,
            }));

        } catch (error: any) {
            this.logger.error(`Search error: ${error.message}`);
            return [];
        }
    }

    /**
     * Extract structured details from a URL using Perplexity Sonar
     */
    async extractDetails(url: string, title: string): Promise<StructuredItem | null> {
        if (!this.apiKey) {
            this.logger.error('Perplexity API key not configured');
            return null;
        }

        try {
            const response = await fetch(`${this.baseUrl}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: 'sonar',
                    messages: [
                        {
                            role: 'system',
                            content: `You are extracting structured information about competitions and events. 
Return ONLY valid JSON matching this exact schema:
{
  "title": "string - event title",
  "what_it_is": "string - 1-2 sentence description",
  "deadline": "string or null - application/registration deadline if found",
  "deadline_confidence": "high|medium|low or null",
  "location": "string or null",
  "eligibility": "string or null - who can participate",
  "link": "string - the URL",
  "source_domain": "string - domain name",
  "notes": "string or null - any important additional info"
}
If deadline is not found, set deadline to null and deadline_confidence to null. Do NOT hallucinate dates.`
                        },
                        {
                            role: 'user',
                            content: `Extract details about this event/competition. URL: ${url}\nTitle: ${title}\n\nReturn only the JSON object.`
                        }
                    ],
                    max_tokens: 1000,
                    temperature: 0.0,
                    search_context_size: 'low',
                }),
            });

            if (!response.ok) {
                this.logger.error(`Extraction API error: ${response.status}`);
                return null;
            }

            const data = await response.json();
            const content = data.choices?.[0]?.message?.content || '';

            // Parse JSON
            try {
                const jsonMatch = content.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    const item = JSON.parse(jsonMatch[0]) as StructuredItem;
                    // Ensure link is set
                    item.link = item.link || url;
                    item.source_domain = item.source_domain || new URL(url).hostname;
                    return item;
                }
            } catch (parseError) {
                this.logger.warn(`Failed to parse extraction result: ${parseError}`);
            }

            // Fallback
            return {
                title,
                what_it_is: 'Competition or event',
                deadline: null,
                deadline_confidence: null,
                location: null,
                eligibility: null,
                link: url,
                source_domain: new URL(url).hostname,
                notes: null,
            };

        } catch (error: any) {
            this.logger.error(`Extraction error: ${error.message}`);
            return null;
        }
    }
}
