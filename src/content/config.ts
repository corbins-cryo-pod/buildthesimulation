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
    website: z.string().url().optional(),
    tags: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
  }),
});

export const collections = { news, articles, ideas, companies };
