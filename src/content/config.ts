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

export const collections = { news, articles };
