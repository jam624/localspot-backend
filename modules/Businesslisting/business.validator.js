const { z } = require('zod');
const { STATUS } = require('../models/business.model');

const id = z.number().int().positive();
const phone = z.string().trim().regex(/^\+?[0-9\s\-()]{7,20}$/, 'Invalid phone number');
const url = z.string().trim().url('Invalid URL').max(500);
const shortText = (max) => z.string().trim().min(1).max(max);

const imageInput = z.object({
  url: z.string().trim().url('Invalid image URL').max(500),
  publicId: z.string().trim().max(200).optional(),
});

const hoursEntry = z
  .object({
    day: z.number().int().min(0).max(6),
    open: z.number().int().min(0).max(1439),
    close: z.number().int().min(1).max(1440),
  })
  .refine((h) => h.close > h.open, { message: 'close must be later than open', path: ['close'] });

const baseFields = z
  .object({
    name: z.string().trim().min(2).max(120),
    category: id,
    description: z.string().trim().min(10).max(2000),
    phone,
    whatsapp: phone,
    email: z.string().trim().toLowerCase().email().max(200),
    website: url,
    address: z.string().trim().min(3).max(250),
    city: shortText(80),
    area: shortText(80),
    location: z.object({
      lat: z.number().min(-90).max(90),
      lng: z.number().min(-180).max(180),
    }),
    hours: z.array(hoursEntry).max(28),
    priceRange: z.number().int().min(1).max(4),
    services: z.array(shortText(60)).max(30),
    amenities: z.array(shortText(60)).max(30),
    logo: imageInput,
    coverImage: imageInput,
    gallery: z.array(imageInput).max(12),
  })
  .strict();

// A draft only needs a name and category; completeness is enforced on submit/publish.
const createSchema = baseFields.partial().required({ name: true, category: true });

const updateSchema = baseFields
  .partial()
  .refine((d) => Object.keys(d).length > 0, { message: 'Provide at least one field to update' });

const adminCreateSchema = createSchema.extend({
  owner: id.optional(),
  publish: z.boolean().optional(), // create and publish in one step
});

const statusSchema = z
  .object({
    status: z.enum(STATUS),
    reason: z.string().trim().min(1).max(500).optional(),
  })
  .refine((d) => !['rejected', 'suspended'].includes(d.status) || !!d.reason, {
    message: 'reason is required when rejecting or suspending',
    path: ['reason'],
  });

const activeSchema = z.object({ isActive: z.boolean() });

const listQuerySchema = z
  .object({
    q: z.string().trim().min(1).max(100).optional(),
    category: z.string().trim().min(1).max(100).optional(), // id or slug
    city: shortText(80).optional(),
    area: shortText(80).optional(),
    minRating: z.coerce.number().min(0).max(5).optional(),
    minPrice: z.coerce.number().int().min(1).max(4).optional(),
    maxPrice: z.coerce.number().int().min(1).max(4).optional(),
    openNow: z.enum(['true', 'false']).transform((v) => v === 'true').optional(),
    lat: z.coerce.number().min(-90).max(90).optional(),
    lng: z.coerce.number().min(-180).max(180).optional(),
    radiusKm: z.coerce.number().min(0.1).max(100).default(10),
    sort: z.enum(['recommended', 'rated', 'popular', 'newest']).default('recommended'),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(20),
  })
  .refine((d) => (d.lat === undefined) === (d.lng === undefined), {
    message: 'lat and lng must be provided together',
    path: ['lat'],
  });

const adminListQuerySchema = z.object({
  q: z.string().trim().min(1).max(100).optional(),
  status: z.enum(STATUS).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

/** Validates req[source] and stores the parsed result on req.valid[source]. */
const validate = (schema, source = 'body') => (req, res, next) => {
  const result = schema.safeParse(req[source]);
  if (!result.success) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: result.error.issues.map((i) => ({ field: i.path.join('.'), message: i.message })),
    });
  }
  req.valid = req.valid || {};
  req.valid[source] = result.data;
  next();
};

const validateId = (req, res, next) => {
  if (!/^[1-9]\d{0,17}$/.test(req.params.id)) {
    return res.status(400).json({ success: false, message: 'Invalid id' });
  }
  next();
};

module.exports = {
  validate,
  validateId,
  createSchema,
  updateSchema,
  adminCreateSchema,
  statusSchema,
  activeSchema,
  listQuerySchema,
  adminListQuerySchema,
};
