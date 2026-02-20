const homeBlocks = [
    {
        id: 'home-hero',
        type: 'hero',
        title: "Nepal's Public Intelligence Platform",
        subtitle:
            "Monitor public mentions, track sentiment, and understand narrative shifts across Nepal's digital media ecosystem.",
        ctaText: 'Start Free Trial',
        ctaLink: '/register',
        backgroundImage: '',
    },
    {
        id: 'home-features',
        type: 'feature_grid',
        items: [
            {
                id: 'feature-1',
                icon: 'Radar',
                title: 'Real-Time Monitoring',
                description:
                    'Track mentions across Nepali news, YouTube, Reddit, and connected public sources.',
            },
            {
                id: 'feature-2',
                icon: 'Languages',
                title: 'Bilingual Analysis',
                description:
                    'Analyze content in Nepali and English with language-aware sentiment scoring.',
            },
            {
                id: 'feature-3',
                icon: 'Bell',
                title: 'Smart Alerts',
                description:
                    'Get notified for spikes, sentiment shifts, and keyword-level changes.',
            },
            {
                id: 'feature-4',
                icon: 'BarChart3',
                title: 'Analytics Dashboard',
                description:
                    'Review trend lines, top sources, mention volume, and confidence signals.',
            },
            {
                id: 'feature-5',
                icon: 'FileText',
                title: 'Exportable Reports',
                description:
                    'Generate shareable summaries for teams, clients, or leadership review.',
            },
            {
                id: 'feature-6',
                icon: 'Shield',
                title: 'Public Data Only',
                description:
                    'Monitor public sources while respecting platform rules and privacy constraints.',
            },
        ],
    },
    {
        id: 'home-how-it-works',
        type: 'rich_text',
        content: `## How It Works

### 1. Configure a project
Set your keywords, boolean query, and source preferences.

### 2. Collect public mentions
Connectors ingest mentions from supported public channels.

### 3. Analyze signals
Each mention is processed for language, sentiment, and relevance.

### 4. Take action
Use dashboard insights, alerting, and reporting to drive decisions.`,
    },
    {
        id: 'home-cta',
        type: 'cta_band',
        text: 'Ready to understand what people are saying?',
        buttonText: 'Get Started',
        buttonLink: '/register',
    },
];

const aboutBlocks = [
    {
        id: 'about-hero',
        type: 'hero',
        title: "About NPIP",
        subtitle:
            "Built for Nepal-first media intelligence with practical workflows for communications and research teams.",
        ctaText: 'Contact Us',
        ctaLink: '/contact',
        backgroundImage: '',
    },
    {
        id: 'about-content',
        type: 'rich_text',
        content: `## Our Mission

NPIP helps organizations make sense of public narratives quickly and responsibly.

- Track people, brands, and issue narratives
- Detect spikes before they become crises
- Compare sentiment across time windows
- Improve decision quality with source-level evidence`,
    },
    {
        id: 'about-cta',
        type: 'cta_band',
        text: 'Need a walkthrough for your team?',
        buttonText: 'Book a Demo',
        buttonLink: '/contact',
    },
];

const faqBlocks = [
    {
        id: 'faq-hero',
        type: 'hero',
        title: 'Frequently Asked Questions',
        subtitle: 'Answers about sources, freshness, and usage.',
        ctaText: 'Contact Support',
        ctaLink: '/contact',
        backgroundImage: '',
    },
    {
        id: 'faq-general',
        type: 'rich_text',
        content: `## General

### What is NPIP?
NPIP is a Nepal-focused platform for tracking public mentions and sentiment.

### Who is it for?
PR teams, campaigns, NGOs, researchers, and media professionals.

### Which sources are supported?
Local news, YouTube, Reddit, and optional best-effort connectors.`,
    },
    {
        id: 'faq-troubleshooting',
        type: 'rich_text',
        content: `## Troubleshooting

### Why are results low?
- Date range is too short
- Source filters are too narrow
- Keywords are too strict
- Connector is delayed

### How can I improve results?
- Add aliases and spelling variants
- Use boolean operators (AND, OR, NOT)
- Exclude noisy terms
- Validate with wider date range`,
    },
    {
        id: 'faq-cta',
        type: 'cta_band',
        text: 'Still need help?',
        buttonText: 'Contact Support',
        buttonLink: '/contact',
    },
];

const contactBlocks = [
    {
        id: 'contact-hero',
        type: 'hero',
        title: 'Contact',
        subtitle: 'Support, onboarding, and partnerships.',
        ctaText: 'Email Support',
        ctaLink: '/contact',
        backgroundImage: '',
    },
    {
        id: 'contact-info',
        type: 'rich_text',
        content: `## Contact Channels

### Product Support
**support@npip.com.np**

### Sales and Onboarding
**sales@npip.com.np**

### Partnerships
**hello@npip.com.np**

## Business Hours
Sunday to Friday, 10:00 AM to 6:00 PM NPT`,
    },
    {
        id: 'contact-cta',
        type: 'cta_band',
        text: 'Need a product walkthrough?',
        buttonText: 'Book a Demo',
        buttonLink: '/register',
    },
];

const privacyBlocks = [
    {
        id: 'privacy-hero',
        type: 'hero',
        title: 'Privacy Policy',
        subtitle: 'Last updated: February 2026',
        ctaText: '',
        ctaLink: '',
        backgroundImage: '',
    },
    {
        id: 'privacy-content',
        type: 'rich_text',
        content: `## Privacy Summary

We process account data, usage telemetry, and public mention data to deliver the service.

We do not access private messages or private accounts.

For privacy requests, contact **privacy@npip.com.np**.`,
    },
];

const termsBlocks = [
    {
        id: 'terms-hero',
        type: 'hero',
        title: 'Terms of Service',
        subtitle: 'Last updated: February 2026',
        ctaText: '',
        ctaLink: '',
        backgroundImage: '',
    },
    {
        id: 'terms-content',
        type: 'rich_text',
        content: `## Terms Summary

Use NPIP for legitimate monitoring and research purposes.

Do not abuse APIs, attempt unauthorized access, or use the service for illegal activity.

For legal questions, contact **legal@npip.com.np**.`,
    },
];

const pricingBlocks = [
    {
        id: 'pricing-hero',
        type: 'hero',
        title: 'Pricing',
        subtitle: 'Simple plans for teams of different sizes.',
        ctaText: 'Start Free Trial',
        ctaLink: '/register',
        backgroundImage: '',
    },
    {
        id: 'pricing-plans',
        type: 'feature_grid',
        items: [
            {
                id: 'starter',
                icon: 'Zap',
                title: 'Starter',
                description: 'For pilots and single-project monitoring.',
            },
            {
                id: 'pro',
                icon: 'Rocket',
                title: 'Pro',
                description: 'For teams monitoring multiple topics consistently.',
            },
            {
                id: 'enterprise',
                icon: 'Building',
                title: 'Enterprise',
                description: 'For high-volume monitoring and custom integration needs.',
            },
        ],
    },
    {
        id: 'pricing-content',
        type: 'rich_text',
        content: `## Billing Notes

- Monthly and annual billing are supported
- Plan changes follow your billing cycle rules
- Contact sales for custom onboarding`,
    },
    {
        id: 'pricing-cta',
        type: 'cta_band',
        text: 'Need help selecting a plan?',
        buttonText: 'Talk to Sales',
        buttonLink: '/contact',
    },
];

export const DEFAULT_CMS_PAGES = [
    {
        title: 'Home',
        slug: 'home',
        status: 'published',
        seo: {
            metaTitle: "NPIP - Nepal's Public Intelligence Platform",
            metaDescription:
                'Monitor mentions, sentiment, and public narrative shifts across Nepali digital sources.',
            slug: 'home',
            canonical: '',
            ogImage: '',
        },
        blocks: homeBlocks,
    },
    {
        title: 'About',
        slug: 'about',
        status: 'published',
        seo: {
            metaTitle: 'About NPIP',
            metaDescription: 'Learn how NPIP helps teams monitor and understand public narratives.',
            slug: 'about',
            canonical: '',
            ogImage: '',
        },
        blocks: aboutBlocks,
    },
    {
        title: 'FAQ',
        slug: 'faq',
        status: 'published',
        seo: {
            metaTitle: 'FAQ | NPIP',
            metaDescription: 'Common questions about NPIP features, sources, and workflows.',
            slug: 'faq',
            canonical: '',
            ogImage: '',
        },
        blocks: faqBlocks,
    },
    {
        title: 'Contact',
        slug: 'contact',
        status: 'published',
        seo: {
            metaTitle: 'Contact | NPIP',
            metaDescription: 'Contact NPIP for support, onboarding, demos, and partnerships.',
            slug: 'contact',
            canonical: '',
            ogImage: '',
        },
        blocks: contactBlocks,
    },
    {
        title: 'Privacy Policy',
        slug: 'privacy',
        status: 'published',
        seo: {
            metaTitle: 'Privacy Policy | NPIP',
            metaDescription: 'How NPIP handles data and privacy requests.',
            slug: 'privacy',
            canonical: '',
            ogImage: '',
        },
        blocks: privacyBlocks,
    },
    {
        title: 'Terms of Service',
        slug: 'terms',
        status: 'published',
        seo: {
            metaTitle: 'Terms of Service | NPIP',
            metaDescription: 'Terms governing use of NPIP services.',
            slug: 'terms',
            canonical: '',
            ogImage: '',
        },
        blocks: termsBlocks,
    },
    {
        title: 'Pricing',
        slug: 'pricing',
        status: 'published',
        seo: {
            metaTitle: 'Pricing | NPIP',
            metaDescription: 'Plan options for teams monitoring public narratives in Nepal.',
            slug: 'pricing',
            canonical: '',
            ogImage: '',
        },
        blocks: pricingBlocks,
    },
];

