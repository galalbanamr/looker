import { z } from 'zod';

export const userSchema = z.object({
    id: z.string(),
    phone: z.string(),
    name: z.string().nullable(),
    email: z.string().nullable(),
    timezone: z.string(),
    whatsappOptIn: z.boolean(),
    createdAt: z.string(),
});

export const searchProfileSchema = z.object({
    id: z.string(),
    name: z.string(),
    keywords: z.array(z.string()),
    location: z.string(),
    frequencyPerDay: z.number(),
    quietHoursStart: z.number().nullable(),
    quietHoursEnd: z.number().nullable(),
    maxResultsPerRun: z.number(),
    notificationMode: z.enum(['immediate', 'digest']),
    digestTime: z.string().nullable(),
    whatsappNumber: z.string(),
    isActive: z.boolean(),
    createdAt: z.string(),
    updatedAt: z.string(),
});

export const discoveredItemSchema = z.object({
    id: z.string(),
    title: z.string(),
    whatItIs: z.string(),
    deadline: z.string().nullable(),
    deadlineConfidence: z.enum(['high', 'medium', 'low']).nullable(),
    url: z.string(),
    sourceDomain: z.string(),
    location: z.string().nullable(),
    eligibility: z.string().nullable(),
    notified: z.boolean(),
    discoveredAt: z.string(),
});

export type User = z.infer<typeof userSchema>;
export type SearchProfile = z.infer<typeof searchProfileSchema>;
export type DiscoveredItem = z.infer<typeof discoveredItemSchema>;
