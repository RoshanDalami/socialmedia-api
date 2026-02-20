import dotenv from 'dotenv';
import mongoose from 'mongoose';
import connectToDB from '../db/connectToDatabase.helper.js';
import { AdminPage } from '../model/adminPage.model.js';
import { DEFAULT_CMS_PAGES } from '../data/defaultCmsPages.js';

dotenv.config({ path: './ai.env' });

const replaceExisting = process.argv.includes('--replace');
const dryRun = process.argv.includes('--dry-run');

const buildInsertPayload = (page) => ({
    title: page.title,
    slug: page.slug,
    status: page.status || 'published',
    seo: page.seo || {
        metaTitle: page.title,
        metaDescription: '',
        slug: page.slug,
        canonical: '',
        ogImage: '',
    },
    blocks: Array.isArray(page.blocks) ? page.blocks : [],
});

const buildOperations = () =>
    DEFAULT_CMS_PAGES.map((page) => {
        const payload = buildInsertPayload(page);
        return {
            updateOne: {
                filter: { slug: payload.slug },
                update: replaceExisting ? { $set: payload } : { $setOnInsert: payload },
                upsert: true,
                timestamps: false,
            },
        };
    });

const run = async () => {
    if (dryRun) {
        console.log(
            `[dry-run] Ready to seed ${DEFAULT_CMS_PAGES.length} pages (${replaceExisting ? 'replace' : 'insert-missing'})`
        );
        console.log(
            `[dry-run] Slugs: ${DEFAULT_CMS_PAGES.map((page) => page.slug).join(', ')}`
        );
        return;
    }

    await connectToDB();

    const result = await AdminPage.bulkWrite(buildOperations(), {
        ordered: false,
        timestamps: false,
    });
    const inserted = result.upsertedCount ?? 0;
    const modified = result.modifiedCount ?? 0;
    const matched = result.matchedCount ?? 0;

    console.log(
        `Default CMS pages seed complete. mode=${replaceExisting ? 'replace' : 'insert-missing'} inserted=${inserted} modified=${modified} matched=${matched}`
    );
};

run()
    .catch((error) => {
        console.error('Failed to seed default CMS pages:', error?.message || error);
        process.exitCode = 1;
    })
    .finally(async () => {
        await mongoose.connection.close().catch(() => {});
    });
