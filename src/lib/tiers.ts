import { PositionTier } from '../types';

export const TIERS: PositionTier[] = [
  { 
    id: 'starter', name: 'Starter Manager', price: 30, dailyTasks: 30, approxPrice: 20, reward: 1.20, commissionRate: '0.2%', stars: 5, status: 'apply', image: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=800&auto=format&fit=crop&q=60',
    flowSteps: {
      step1: {
        title: 'Retail Inventory Sourcing',
        desc: 'Capital is used to acquire basic retail clearance inventory.',
        detailTitle: 'Retail Inventory Sourcing',
        detailDesc: 'At the Starter level, your capital is deployed to purchase clearance and off-season retail inventory in bulk. This allows for entry-level market participation with minimal risk.',
        image: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=800&auto=format&fit=crop&q=80'
      },
      step2: {
        title: 'Micro E-Commerce Sales',
        desc: 'Items are individually resold on consumer platforms.',
        detailTitle: 'Micro E-Commerce Sales',
        detailDesc: 'These retail items are listed across various B2C e-commerce platforms. The system automatically manages these micro-sales, generating a steady, modest profit margin from consumer purchases.',
        image: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800&auto=format&fit=crop&q=80'
      },
      step3: {
        title: 'Starter Daily Commission',
        desc: 'Earn basic daily returns from completed micro-sales.',
        detailTitle: 'Starter Daily Commission',
        detailDesc: 'Once the micro-sales are finalized daily, the profit margin is calculated and a fixed percentage is credited to your wallet. This provides a reliable introduction to e-commerce earnings.',
        image: 'https://images.unsplash.com/photo-1580519542014-27034f63a3be?w=800&auto=format&fit=crop&q=80'
      }
    }
  },
  { 
    id: 'trainee', name: 'Trainee Manager', price: 50, dailyTasks: 30, approxPrice: 40, reward: 3.60, commissionRate: '0.3%', stars: 5, status: 'apply', image: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=800&auto=format&fit=crop&q=60',
    flowSteps: {
      step1: {
        title: 'Clothing & Fashion Sourcing',
        desc: 'Capital procures high-demand European fashion bulk inventory.',
        detailTitle: 'Global Fashion Sourcing',
        detailDesc: 'When you activate a plan, your capital is instantly deployed into Zalando Pro\'s high-volume European wholesale network. We bulk-purchase trending and premium fashion items at deep discounts from manufacturers and top-tier brands.',
        image: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800&auto=format&fit=crop&q=80'
      },
      step2: {
        title: 'Global E-Commerce Reselling',
        desc: 'Merchandise is resold across retail networks at high margins.',
        detailTitle: 'Automated Global Reselling',
        detailDesc: 'Our intelligent fulfillment system automatically lists and resells this procured inventory across global B2C e-commerce networks. Because we sourced at wholesale prices, the retail markup generates significant profit margins.',
        image: 'https://images.unsplash.com/photo-1586528116311-ad8ed7451216?w=800&auto=format&fit=crop&q=80'
      },
      step3: {
        title: 'Daily Guaranteed Commission',
        desc: 'Resale commissions are credited directly to your wallet daily.',
        detailTitle: 'Daily Guaranteed Commission',
        detailDesc: 'The profits from these automated global sales are finalized daily. A fixed percentage of this retail margin is credited directly into your app wallet as your guaranteed daily commission, which you can withdraw instantly.',
        image: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=800&auto=format&fit=crop&q=80'
      }
    }
  },
  { 
    id: 'general', name: 'General Manager', price: 300, dailyTasks: 20, approxPrice: 200, reward: 20.00, commissionRate: '0.5%', stars: 5, status: 'apply', image: 'https://images.unsplash.com/photo-1573855619003-97b4799dcd8b?w=800&auto=format&fit=crop&q=60',
    flowSteps: {
      step1: {
        title: 'Premium Brands Wholesale',
        desc: 'Funds bulk purchases of luxury items directly from manufacturers.',
        detailTitle: 'Premium Brands Wholesale',
        detailDesc: 'At the General Manager tier, your capital has the purchasing power to secure exclusive wholesale deals directly from luxury brand manufacturers, bypassing middlemen and securing premium inventory at the lowest possible cost.',
        image: 'https://images.unsplash.com/photo-1567401893414-76b7b1e5a7a5?w=800&auto=format&fit=crop&q=80'
      },
      step2: {
        title: 'B2B Cross-Border Distribution',
        desc: 'Inventory is distributed globally at significant B2B markups.',
        detailTitle: 'B2B Cross-Border Distribution',
        detailDesc: 'Instead of individual retail sales, this premium inventory is distributed to secondary retailers and boutique networks globally. This Business-to-Business (B2B) model ensures rapid turnover and highly lucrative markups.',
        image: 'https://images.unsplash.com/photo-1578575437130-527eed3abbec?w=800&auto=format&fit=crop&q=80'
      },
      step3: {
        title: 'High-Yield Profit Sharing',
        desc: 'Large-scale margins provide a much higher daily ROI percentage.',
        detailTitle: 'High-Yield Profit Sharing',
        detailDesc: 'Because B2B transactions involve massive volume and substantial margins, your share of the profits is significantly elevated. These high-yield dividends are settled daily and immediately available for withdrawal.',
        image: 'https://images.unsplash.com/photo-1518186285589-2f7649de83e0?w=800&auto=format&fit=crop&q=80'
      }
    }
  },
  { 
    id: 'senior', name: 'Senior Manager', price: 800, dailyTasks: 10, approxPrice: 500, reward: 50.00, commissionRate: '1%', stars: 5, status: 'apply', image: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800&auto=format&fit=crop&q=60',
    flowSteps: {
      step1: {
        title: 'Supply Chain Financing',
        desc: 'Capital provides bridge financing for major fashion supply chains.',
        detailTitle: 'Supply Chain Financing',
        detailDesc: 'Senior Managers operate at an institutional level. Your capital is utilized to provide critical bridge financing for global fashion supply chains, securing inventory before it even hits the production line.',
        image: 'https://images.unsplash.com/photo-1504917595217-d4dc5ebe6122?w=800&auto=format&fit=crop&q=80'
      },
      step2: {
        title: 'Algorithmic Global Arbitrage',
        desc: 'AI automatically exploits price differences across continents.',
        detailTitle: 'Algorithmic Global Arbitrage',
        detailDesc: 'Our proprietary AI algorithms track global fashion market demands in real-time. The system automatically routes the financed inventory to the exact continent where it will fetch the absolute highest premium price.',
        image: 'https://images.unsplash.com/photo-1639322537228-f710d846310a?w=800&auto=format&fit=crop&q=80'
      },
      step3: {
        title: 'Elite Daily Dividends',
        desc: 'Advanced arbitrage guarantees exceptionally stable daily commissions.',
        detailTitle: 'Elite Daily Dividends',
        detailDesc: 'By capitalizing on global arbitrage rather than simple retail, the profit margins are both massive and highly consistent. You receive elite-level daily dividends directly proportional to the global market inefficiencies we exploit.',
        image: 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=800&auto=format&fit=crop&q=80'
      }
    }
  },
  { 
    id: 'regional', name: 'Regional Manager', price: 2000, dailyTasks: 10, approxPrice: 1100, reward: 121.00, commissionRate: '1.1%', stars: 5, status: 'apply', image: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800&auto=format&fit=crop&q=60',
    flowSteps: {
      step1: {
        title: 'Exclusive Regional Distribution',
        desc: 'Secures exclusive distribution rights for high-end brands.',
        detailTitle: 'Exclusive Regional Distribution',
        detailDesc: 'As a Regional Manager, your substantial capital block is leveraged to secure exclusive distribution contracts for high-end European brands in emerging, high-growth markets like Asia and South America.',
        image: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&auto=format&fit=crop&q=80'
      },
      step2: {
        title: 'Large-Scale Retail Syndication',
        desc: 'Syndicated sales across retail chains maximize profit velocity.',
        detailTitle: 'Large-Scale Retail Syndication',
        detailDesc: 'With exclusive rights secured, the inventory is syndicated across hundreds of partnered retail chains simultaneously. This creates massive profit velocity, turning over inventory at an unprecedented scale.',
        image: 'https://images.unsplash.com/photo-1556740758-90de374c12ad?w=800&auto=format&fit=crop&q=80'
      },
      step3: {
        title: 'Regional Revenue Share',
        desc: 'Earn a substantial cut from the entire region\'s transactions.',
        detailTitle: 'Regional Revenue Share',
        detailDesc: 'You are no longer just earning from single sales; you earn a percentage cut of the wholesale transactions across an entire economic region. This results in breathtaking daily revenue generation.',
        image: 'https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?w=800&auto=format&fit=crop&q=80'
      }
    }
  },
  { 
    id: 'reg_gen', name: 'Regional General Manager', price: 5000, dailyTasks: 10, approxPrice: 3000, reward: 390.00, commissionRate: '1.3%', stars: 5, status: 'apply', image: 'https://images.unsplash.com/photo-1555529771-835f59fc5efe?w=800&auto=format&fit=crop&q=60',
    flowSteps: {
      step1: {
        title: 'Global Manufacturing Equity',
        desc: 'Capital takes equity positions in new fashion manufacturing runs.',
        detailTitle: 'Global Manufacturing Equity',
        detailDesc: 'At the pinnacle tier, you act as an equity partner. Your capital directly funds the manufacturing runs of entire new collections for major fashion houses, effectively owning the merchandise at production cost.',
        image: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=800&auto=format&fit=crop&q=80'
      },
      step2: {
        title: 'Direct-to-Consumer Monopolization',
        desc: 'Complete supply chain control maximizes D2C profit margins.',
        detailTitle: 'Direct-to-Consumer Monopolization',
        detailDesc: 'By owning the production, Zalando Pro executes a Direct-to-Consumer (D2C) monopolization strategy. Bypassing all wholesalers and middlemen means 100% of the retail markup is captured as pure profit.',
        image: 'https://images.unsplash.com/photo-1512428559087-560fa5ceab42?w=800&auto=format&fit=crop&q=80'
      },
      step3: {
        title: 'Executive Daily Royalties',
        desc: 'Unmatched daily returns powered by total supply chain ownership.',
        detailTitle: 'Executive Daily Royalties',
        detailDesc: 'This total supply chain dominance generates unparalleled revenue. As an equity-level participant, your daily returns are structured as executive royalties, offering the absolute highest guaranteed income available.',
        image: 'https://images.unsplash.com/photo-1556742044-3c52d6e88c62?w=800&auto=format&fit=crop&q=80'
      }
    }
  },
  { 
    id: 'reg_vp', name: 'Regional Vice President', price: 10000, dailyTasks: 5, approxPrice: 6000, reward: 850.00, commissionRate: '1.5%', stars: 5, status: 'apply', image: 'https://images.unsplash.com/photo-1581044777550-4cfa60707c03?w=800&auto=format&fit=crop&q=80',
    flowSteps: {
      step1: {
        title: 'Global Vice Capital Sourcing',
        desc: 'Institutional capital acquisition for multi-national fashion lines.',
        detailTitle: 'Global Vice Capital Sourcing',
        detailDesc: 'Deploy capital across multi-national high fashion acquisitions with dedicated institutional liquidity.',
        image: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=800&auto=format&fit=crop&q=80'
      },
      step2: {
        title: 'Vice Syndicate Distribution',
        desc: 'Exclusive global distribution channels across key regions.',
        detailTitle: 'Vice Syndicate Distribution',
        detailDesc: 'Exclusive wholesale channels distribute high-volume luxury merchandise worldwide.',
        image: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800&auto=format&fit=crop&q=80'
      },
      step3: {
        title: 'Executive Vice Returns',
        desc: 'High-margin returns credited directly on daily schedules.',
        detailTitle: 'Executive Vice Returns',
        detailDesc: 'Daily vice-executive dividends generated directly from global wholesale revenue streams.',
        image: 'https://images.unsplash.com/photo-1580519542014-27034f63a3be?w=800&auto=format&fit=crop&q=80'
      }
    }
  },
  { 
    id: 'reg_pres', name: 'Regional President', price: 20000, dailyTasks: 5, approxPrice: 12000, reward: 1800.00, commissionRate: '1.8%', stars: 5, status: 'locked', buttonText: 'Stay Tuned', image: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=800&auto=format&fit=crop&q=80',
    flowSteps: {
      step1: {
        title: 'Presidential Supply Equity',
        desc: 'Presidential-level equity financing for luxury fashion houses.',
        detailTitle: 'Presidential Supply Equity',
        detailDesc: 'Direct equity stake in global supply line production and international luxury releases.',
        image: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800&auto=format&fit=crop&q=80'
      },
      step2: {
        title: 'Continental Arbitrage Dominance',
        desc: 'Algorithmic cross-continental pricing arbitrage.',
        detailTitle: 'Continental Arbitrage Dominance',
        detailDesc: 'Automated global distribution networks capturing optimal continental retail pricing.',
        image: 'https://images.unsplash.com/photo-1586528116311-ad8ed7451216?w=800&auto=format&fit=crop&q=80'
      },
      step3: {
        title: 'Presidential Profit Dividends',
        desc: 'Substantial daily presidential revenue yield credited instantly.',
        detailTitle: 'Presidential Profit Dividends',
        detailDesc: 'Guaranteed top-tier daily returns backed by continental fashion network distribution.',
        image: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=800&auto=format&fit=crop&q=80'
      }
    }
  },
  { 
    id: 'cofounder', name: 'Co-Founder', price: 50000, dailyTasks: 5, approxPrice: 30000, reward: 5000.00, commissionRate: '2.0%', stars: 5, status: 'locked', buttonText: 'Stay Tuned', image: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=800&auto=format&fit=crop&q=80',
    flowSteps: {
      step1: {
        title: 'Founding Infrastructure Control',
        desc: 'Direct co-founding ownership of global retail supply infrastructure.',
        detailTitle: 'Founding Infrastructure Control',
        detailDesc: 'Co-founding partner status granting direct participation in total enterprise revenue streams.',
        image: 'https://images.unsplash.com/photo-1567401893414-76b7b1e5a7a5?w=800&auto=format&fit=crop&q=80'
      },
      step2: {
        title: 'Omnichannel Monopolization',
        desc: 'Full supply chain control capturing 100% of global retail markup.',
        detailTitle: 'Omnichannel Monopolization',
        detailDesc: 'Direct-to-consumer monopolization ensuring maximum enterprise profit retention.',
        image: 'https://images.unsplash.com/photo-1578575437130-527eed3abbec?w=800&auto=format&fit=crop&q=80'
      },
      step3: {
        title: 'Founding Royalty Share',
        desc: 'Unrivaled daily founding royalties from total global volume.',
        detailTitle: 'Founding Royalty Share',
        detailDesc: 'The ultimate executive tier providing unprecedented daily royalty dividends.',
        image: 'https://images.unsplash.com/photo-1518186285589-2f7649de83e0?w=800&auto=format&fit=crop&q=80'
      }
    }
  }
];
