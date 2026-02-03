import { defineCollection, z } from "astro:content";

const linkSchema = z.object({
  title: z.string(),
  url: z.string().url(),
  note: z.string().optional(),
});

const news = defineCollection({
  type: "content",
  schema: z.object({
    title: z.string(),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    description: z.string().optional(),
    tags: z.array(z.string()).default([]),
    links: z.array(linkSchema).default([]),
    draft: z.boolean().default(false),
  }),
});

const articles = defineCollection({
  type: "content",
  schema: z.object({
    title: z.string(),
    order: z.number().int().min(1),
    pubDate: z.coerce.date().optional(),
    updatedDate: z.coerce.date().optional(),
    description: z.string().optional(),
    tags: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
  }),
});

const ideas = defineCollection({
  type: "content",
  schema: z.object({
    title: z.string(),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    description: z.string().optional(),
    tags: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
  }),
});

const companies = defineCollection({
  type: "content",
  schema: z.object({
    title: z.string(),
    order: z.number().int().min(1),
    pubDate: z.coerce.date().optional(),
    updatedDate: z.coerce.date().optional(),
    description: z.string().optional(),
    // Where the org is primarily based (best-effort).
    region: z.enum(["American", "European", "Chinese", "Other"]).default("Other"),
    kind: z.enum(["Company", "Lab"]).default("Company"),

    // Official website (used for a prominent link at the top of the brief).
    website: z.string().url().optional(),

    // Optional mapping metadata (so we can render an atlas map page).
    // If lat/lon are not present, the entry simply won't appear on the map.
    location: z.string().optional(), // e.g., "San Francisco, CA" or "Munich, Germany"
    lat: z.number().min(-90).max(90).optional(),
    lon: z.number().min(-180).max(180).optional(),

    tags: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
  }),
});

export const collections = { news, articles, ideas, companies };
