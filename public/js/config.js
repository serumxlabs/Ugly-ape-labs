/**
 * Project config — Ugly Ape Squad (replace placeholders with live links, mints, and copy).
 */
window.UGLY_APE_SQUAD_CONFIG = {
  // ——— Brand ———
  projectName: 'Ugly Ape Squad',
  dashboardTitle: 'U.A.S',
  siteUrl: 'https://your-domain.vercel.app',
  siteTitle: 'Ugly Ape Squad — NFT & Token',
  siteDescription: 'Ugly Ape Squad on Solana — collections, token, holders, and community.',
  ogImageUrl: 'assets/logo.png',
  tagline: 'WE ARE UGLY',
  logoUrl: 'assets/logo.png',

  // ——— Social ———
  social: {
    x: 'https://x.com/uglyapesquad',
    discord: '#',
  },
  shopUrl: '',

  // ——— Token ———
  token: {
    name: 'SERUMX',
    symbol: 'SERUMX',
    navLabel: 'SERUMX',
    logoUrl: 'assets/logo.png',
    menuIconUrl: 'assets/coin-icon.svg',
    priceLabel: 'SERUMX / USD',
    chartLabel: 'SERUMX / USD — 15m',
    sectionLead: 'SERUMX on Solana.',
    summaryText: 'SERUMX — project token. Verify holdings in the dashboard.',
  },

  hero: {
    title: 'Ugly Ape Squad',
    tagline: '',
    solanaLogoUrl: '/assets/solana-logo.svg',
    backgroundImage: 'assets/hero-bg.png',
    musicSrc: 'assets/audio/mutation-on-deck-remastered.mp3',
    musicLabel: 'Mutation on Deck',
  },

  intro: {
    title: 'Intro',
    body: '<p>Add your project story here.</p><p>Replace this copy in <code>js/config.js</code> with Ugly Ape Squad lore, roadmap highlights, and links.</p>',
  },

  footerCopy: 'Ugly Ape Squad',

  utilitiesLead: 'Staking, partner utilities and external tools.',
  /**
   * Live utility tiles (bg images from css: .card--gotm, .card--lunarverse).
   * - variant omitted + links[] → GOTM-style card (image from CSS).
   * - variant: 'lunarverse' + url → full-width banner card; optional ctaLabel for button text.
   */
  utilities: [
    {
      name: 'GOTM Labz',
      description: 'Trait store and NFT staking for Ugly Ape Squad on Solana.',
      links: [
        { label: 'Trait store', url: 'https://www.gotmlabz.io/traitstore/ugly-ape-squad' },
        { label: 'NFT staking', url: 'https://www.gotmlabz.io/nftstake/uglylabs' },
      ],
    },
    {
      variant: 'lunarverse',
      name: 'Lunarverse',
      description: 'Quests, rewards, and community utilities for Ugly Ape Squad.',
      url: 'https://uglyapesquad.lunarverse.app/',
      ctaLabel: 'Open Lunarverse',
    },
  ],

  utilitiesComingSoon: [],

  partnersLead: 'Platforms and tools integrated with Ugly Ape Squad.',
  partnersPlaceholder: 'Adding soon',
  partners: [],

  // Keys match server countKey names: token, col1, col2, totalNfts
  holdingsLabels: {
    token: 'SERUMX',
    col1: 'Apes',
    col2: 'Mutants',
    totalNfts: 'Total NFTs',
  },
  holdersLead: 'Top holders by SERUMX and NFT collections.',
  holdersSortOptions: {
    token: 'SERUMX',
    col1: 'Apes',
    col2: 'Mutants',
  },

  holderPortalUrl: '',
  endpoints: { holdings: '/api/holdings', discordAuth: '/api/discord/auth' },
  discordConnectUrl: '',
  /** SPL mint for SERUMX (base token). Pair page uses liquidity pair address — different from mint. */
  tokenMint: '64vQ6Km98vEZnz7a1MmgMjsaDYUL7RaLJCDmRiggBAGS',
  /** Dexscreener pair page (liquidity pool url — keep for “Dexscreener →” button) */
  tokenDexscreenerUrl: 'https://dexscreener.com/solana/75uh3cMvJ51o3Jx2AmmZohjVRDe4iiiZpb9n8h7CNr3i',
  tokenDextoolsPairUrl: '',
  tokenBirdeyeUrl: '',

  // Magic Eden marketplace paths — set when collections are live (must match COLLECTION_*_ME_SLUG on the server)
  collections: {
    ugly_ape_squad: 'https://magiceden.io/marketplace/ugly_ape_squad',
    mutant_ugly_ape_squad_collection: 'https://magiceden.io/marketplace/mutant_ugly_ape_squad_collection',
  },

  /** Optional card images when ME/API image is missing; keys = collection ME slug */
  collectionCardImages: {
    ugly_ape_squad: 'assets/logo.png',
    mutant_ugly_ape_squad_collection: 'assets/collections/mutant_ugly_ape_squad_collection.jpg',
  },

  /** Mutants mint section: progress uses /api/collections supply for collectionSlug */
  mutants: {
    collectionSlug: 'mutant_ugly_ape_squad_collection',
    totalSupply: 2222,
    mintUrl: 'https://launchpad.uni-fy.us/core-nft/mutantuglyape',
    partnerUrl: 'https://uni-fy.us',
    partnerLogoUrl: 'assets/uni-fy-logo.png',
    sectionLead: 'Evolve your ape — mint on Uni-fy.',
  },

  team: [
    {
      name: 'Ugly Ape DAO',
      role: 'Founder',
      xProfileUrl: 'https://x.com/UglyapesDao',
      discordId: '818256918769958912',
    },
    {
      name: 'feedle',
      role: 'Co-founder',
      xProfileUrl: 'https://x.com/feedle_',
      discordId: '693534548746829895',
    },
  ],
};
