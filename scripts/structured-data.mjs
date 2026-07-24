const SITE_URL = "https://comeleapi.it/";
const ORGANIZATION_ID = `${SITE_URL}#organization`;
const PERSON_ID = `${SITE_URL}#sara-bordenga`;
const CONTACT_ID = `${SITE_URL}#contact`;
const BOOKING_CHANNEL_ID = `${SITE_URL}#booking-channel`;
const SERVICES_ID = `${SITE_URL}#services`;
const PRODUCTS_ID = `${SITE_URL}#products`;
const YOUNG_LIVING_BRAND_ID = `${SITE_URL}#young-living-brand`;
const PDF_URL = `${SITE_URL}assets/pdf/mini-guida-oli-comeleapi.pdf`;

const AREA_DEFINITIONS = [
  ["bresso", "Bresso"],
  ["cusano-milanino", "Cusano Milanino"],
  ["cormano", "Cormano"],
  ["cinisello-balsamo", "Cinisello Balsamo"],
  ["sesto-san-giovanni", "Sesto San Giovanni"],
  ["milano", "Milano"]
];

const SERVICE_DEFINITIONS = [
  {
    slug: "massaggio-sportivo",
    name: "Massaggio sportivo",
    price: "50.00",
    description: "Servizio di massaggio sportivo della durata dichiarata di 50 minuti, svolto a domicilio da Sara Bordenga.",
    image: "assets/img/icons/icon-sportivo-arm.webp"
  },
  {
    slug: "massaggio-decontratturante",
    name: "Massaggio decontratturante",
    price: "50.00",
    description: "Servizio di massaggio decontratturante della durata dichiarata di 50 minuti, svolto a domicilio da Sara Bordenga.",
    image: "assets/img/icons/icon-decontratturante.webp"
  },
  {
    slug: "massaggio-relax",
    name: "Massaggio relax",
    description: "Servizio di massaggio relax della durata dichiarata di 50 minuti, svolto a domicilio da Sara Bordenga.",
    image: "assets/img/icons/icon-relax.webp"
  },
  {
    slug: "massaggio-drenante",
    name: "Massaggio drenante",
    price: "50.00",
    description: "Servizio di massaggio drenante della durata dichiarata di 50 minuti, svolto a domicilio da Sara Bordenga.",
    image: "assets/img/icons/icon-linfodrenante-up.webp"
  },
  {
    slug: "trattamento-mirato-30-minuti",
    name: "Trattamento Mirato 30 minuti",
    description: "Trattamento mirato della durata dichiarata di 30 minuti, svolto a domicilio da Sara Bordenga.",
    image: "assets/img/icons/icon-mirato-30.webp"
  },
  {
    slug: "kinesio-taping",
    name: "Kinesio taping",
    description: "Servizio di applicazione di kinesio taping svolto a domicilio da Sara Bordenga.",
    image: "assets/img/icons/icon-kinesio-taping.webp"
  },
  {
    slug: "massaggio-oli-essenziali",
    name: "Massaggio con oli essenziali",
    price: "70.00",
    description: "Servizio di massaggio con oli essenziali svolto a domicilio da Sara Bordenga.",
    image: "assets/img/icons/icon-oli-terapeutici.webp"
  }
];

// Domande e risposte: unica fonte di verità condivisa tra il nodo FAQPage
// (dati strutturati) e la sezione FAQ visibile in pagina, come richiesto dalle
// linee guida Google (il testo dello schema deve coincidere con quello mostrato).
export const FAQ_DEFINITIONS = [
  {
    q: "Dove svolgi i massaggi a domicilio?",
    a: "I trattamenti si svolgono a domicilio a Bresso e in tutta l'area di Milano Nord, incluse Cusano Milanino, Cormano, Cinisello Balsamo, Sesto San Giovanni e Milano. Scrivimi la tua zona su WhatsApp e ti confermo la disponibilità."
  },
  {
    q: "Come funziona il massaggio a domicilio?",
    a: "Arrivo da te con lettino, teli e oli professionali: a te basta scegliere un ambiente tranquillo. Concordiamo insieme giorno e orario, poi non resta che rilassarsi."
  },
  {
    q: "Quali tipi di massaggio offri?",
    a: "Massaggio sportivo, decontratturante, relax, drenante, trattamento mirato da 30 minuti, kinesio taping e massaggio con oli essenziali. Ogni seduta è personalizzata in base alle tue esigenze."
  },
  {
    q: "Quanto costano i trattamenti?",
    a: "Massaggio sportivo, decontratturante e drenante 50 €, massaggio relax 40 €, trattamento mirato da 30 minuti 30 €, kinesio taping 10 € e massaggio con oli essenziali 70 €."
  },
  {
    q: "Come posso prenotare un trattamento?",
    a: "Il modo più rapido è scrivere su WhatsApp al 388 163 9306 oppure via email a sara.bordenga@gmail.com. Ti rispondo per fissare insieme l'appuntamento."
  },
  {
    q: "Che cosa sono gli oli essenziali Young Living che proponi?",
    a: "Sono oli essenziali puri e kit selezionati da Young Living, di cui sono rivenditrice indipendente. Puoi acquistarli tramite i link della vetrina o chiedermi un consiglio su misura."
  },
  {
    q: "Posso ricevere una consulenza personalizzata sugli oli essenziali?",
    a: "Sì: con la consulenza Signature Blend scegliamo insieme gli oli essenziali più adatti a te, per un percorso di benessere su misura. Si prenota su WhatsApp."
  },
  {
    q: "È disponibile una guida gratuita sugli oli essenziali?",
    a: "Sì. Puoi scaricare gratuitamente «L'Essenziale», la mini-guida introduttiva agli oli essenziali pubblicata da comeleapi, direttamente dal sito."
  },
  {
    q: "Chi è Sara Bordenga?",
    a: "Sara è la fondatrice di comeleapi: massaggiatrice sportiva ed ex atleta, affianca ai trattamenti a domicilio la rivendita di oli essenziali Young Living per accompagnarti verso il tuo benessere."
  },
  {
    q: "In quali lingue posso comunicare?",
    a: "Puoi scrivermi e ricevere assistenza in italiano, inglese e spagnolo."
  }
];

function ref(id) {
  return { "@id": id };
}

function absoluteUrl(value) {
  return new URL(String(value || ""), SITE_URL).href;
}

function areaRefs() {
  return AREA_DEFINITIONS.map(([slug]) => ref(`${SITE_URL}#area-${slug}`));
}

function parseEuroPrice(value) {
  const normalized = String(value || "")
    .replace(/\s/g, "")
    .replace(/€/g, "")
    .replace(/\./g, "")
    .replace(",", ".");
  if (!/^\d+(?:\.\d{1,2})?$/.test(normalized)) {
    throw new Error(`Prezzo prodotto non valido: ${value}`);
  }
  return Number(normalized).toFixed(2);
}

function productSlug(product) {
  const raw = String(product.id || "").replace(/^p-/, "");
  if (!/^[a-z0-9-]+$/.test(raw)) throw new Error(`ID prodotto non valido: ${product.id}`);
  return raw;
}

function identityNodes({ includeServiceCatalog = true, includeBookingChannel = true, includeYoungLivingBrand = true } = {}) {
  return [
    {
      "@id": `${SITE_URL}#logo`,
      "@type": "ImageObject",
      url: `${SITE_URL}assets/img/logo-comeleapi-256.webp`,
      contentUrl: `${SITE_URL}assets/img/logo-comeleapi-256.webp`,
      width: 256,
      height: 256,
      caption: "Logo comeleapi"
    },
    {
      "@id": `${SITE_URL}#primary-image`,
      "@type": "ImageObject",
      url: `${SITE_URL}assets/img/hero/hero-massaggio-professionale-comeleapi.webp`,
      contentUrl: `${SITE_URL}assets/img/hero/hero-massaggio-professionale-comeleapi.webp`,
      width: 1376,
      height: 768,
      caption: "Trattamento professionale con oli da massaggio"
    },
    {
      "@id": `${SITE_URL}#brand`,
      "@type": "Brand",
      name: "comeleapi",
      url: SITE_URL,
      slogan: "Vola verso il tuo benessere",
      logo: ref(`${SITE_URL}#logo`)
    },
    {
      "@id": ORGANIZATION_ID,
      "@type": ["Organization", "LocalBusiness"],
      name: "comeleapi",
      url: SITE_URL,
      description: "Progetto commerciale di benessere, massaggi a domicilio e prodotti Young Living curato da Sara Bordenga.",
      slogan: "Vola verso il tuo benessere",
      logo: ref(`${SITE_URL}#logo`),
      image: ref(`${SITE_URL}#primary-image`),
      email: "sara.bordenga@gmail.com",
      telephone: "+393881639306",
      founder: ref(PERSON_ID),
      brand: ref(`${SITE_URL}#brand`),
      contactPoint: ref(CONTACT_ID),
      areaServed: areaRefs(),
      publicAccess: false,
      ...(includeServiceCatalog ? { hasOfferCatalog: ref(SERVICES_ID) } : {}),
      sameAs: [
        "https://www.instagram.com/comeleapi/",
        "https://www.facebook.com/profile.php?id=61591999618100&locale=it_IT"
      ]
    },
    {
      "@id": CONTACT_ID,
      "@type": "ContactPoint",
      contactType: "prenotazioni e informazioni",
      telephone: "+393881639306",
      email: "sara.bordenga@gmail.com",
      url: "https://wa.me/393881639306",
      availableLanguage: ["it", "en", "es"],
      areaServed: areaRefs()
    },
    ...(includeBookingChannel ? [{
      "@id": BOOKING_CHANNEL_ID,
      "@type": "ServiceChannel",
      name: "Prenotazione tramite WhatsApp",
      serviceUrl: "https://wa.me/393881639306",
      servicePhone: ref(CONTACT_ID),
      availableLanguage: ["it", "en", "es"]
    }] : []),
    {
      "@id": PERSON_ID,
      "@type": "Person",
      name: "Sara Bordenga",
      url: `${SITE_URL}#chi-sono`,
      jobTitle: "Massaggiatrice sportiva",
      description: "Fondatrice di comeleapi, massaggiatrice sportiva e rivenditrice indipendente di prodotti Young Living.",
      email: "sara.bordenga@gmail.com",
      telephone: "+393881639306",
      worksFor: ref(ORGANIZATION_ID),
      hasOccupation: [
        { "@type": "Occupation", name: "Massaggiatrice sportiva" },
        { "@type": "Occupation", name: "Rivenditrice indipendente di prodotti Young Living" }
      ],
      knowsLanguage: ["it", "en", "es"]
    },
    ...(includeYoungLivingBrand ? [{
      "@id": YOUNG_LIVING_BRAND_ID,
      "@type": "Brand",
      name: "Young Living",
      url: "https://www.youngliving.com/it_it/"
    }] : []),
    ...AREA_DEFINITIONS.map(([slug, name]) => ({
      "@id": `${SITE_URL}#area-${slug}`,
      "@type": "City",
      name
    }))
  ];
}

function linksIdentityNodes() {
  return [
    {
      "@id": `${SITE_URL}#logo`,
      "@type": "ImageObject",
      url: `${SITE_URL}assets/img/logo-comeleapi-256.webp`,
      contentUrl: `${SITE_URL}assets/img/logo-comeleapi-256.webp`,
      width: 256,
      height: 256,
      caption: "Logo comeleapi"
    },
    {
      "@id": ORGANIZATION_ID,
      "@type": ["Organization", "LocalBusiness"],
      name: "comeleapi",
      url: SITE_URL,
      logo: ref(`${SITE_URL}#logo`)
    }
  ];
}

function serviceNodes() {
  const offerableServices = SERVICE_DEFINITIONS.filter((service) => service.price);
  const catalog = {
    "@id": SERVICES_ID,
    "@type": "OfferCatalog",
    name: "Offerte dei trattamenti con prezzo pubblicato non ambiguo",
    url: `${SITE_URL}#servizi`,
    numberOfItems: offerableServices.length,
    itemListElement: offerableServices.map((service) => ref(`${SITE_URL}#offer-${service.slug}`))
  };
  const services = SERVICE_DEFINITIONS.map((service) => {
    const node = {
      "@id": `${SITE_URL}#service-${service.slug}`,
      "@type": "Service",
      name: service.name,
      serviceType: service.name,
      url: `${SITE_URL}#servizi`,
      description: service.description,
      image: absoluteUrl(service.image),
      provider: ref(ORGANIZATION_ID),
      providerMobility: "dynamic",
      areaServed: areaRefs(),
      availableChannel: ref(BOOKING_CHANNEL_ID)
    };
    if (service.price) node.offers = ref(`${SITE_URL}#offer-${service.slug}`);
    return node;
  });
  const offers = offerableServices.map((service) => ({
    "@id": `${SITE_URL}#offer-${service.slug}`,
    "@type": "Offer",
    price: service.price,
    priceCurrency: "EUR",
    url: `${SITE_URL}#servizi`,
    seller: ref(ORGANIZATION_ID),
    itemOffered: ref(`${SITE_URL}#service-${service.slug}`)
  }));
  return [catalog, ...services, ...offers];
}

function productNodes(products) {
  const visible = products
    .filter((product) => product && product.visible !== false)
    .slice()
    .sort((left, right) => (left.order ?? 0) - (right.order ?? 0));

  const listItems = [];
  const productEntities = [];
  const offers = [];

  visible.forEach((product, index) => {
    const slug = productSlug(product);
    const productId = `${SITE_URL}#product-${slug}`;
    const offerId = `${SITE_URL}#offer-product-${slug}`;
    const image = absoluteUrl(product.image);
    const url = absoluteUrl(product.link);

    listItems.push({
      "@id": `${SITE_URL}#list-item-${slug}`,
      "@type": "ListItem",
      position: index + 1,
      name: String(product.name),
      url,
      image,
      item: ref(productId)
    });
    productEntities.push({
      "@id": productId,
      "@type": "Product",
      name: String(product.name),
      url,
      image,
      description: `Kit o prodotto Young Living "${String(product.name)}" presentato nella vetrina comeleapi.`,
      category: "Kit e prodotti Young Living",
      brand: ref(YOUNG_LIVING_BRAND_ID),
      offers: ref(offerId)
    });
    offers.push({
      "@id": offerId,
      "@type": "Offer",
      price: parseEuroPrice(product.price),
      priceCurrency: "EUR",
      url,
      itemOffered: ref(productId)
    });
  });

  const itemList = {
    "@id": PRODUCTS_ID,
    "@type": "ItemList",
    name: "Kit e prodotti Young Living presentati da comeleapi",
    url: `${SITE_URL}#prodotti`,
    numberOfItems: visible.length,
    itemListOrder: "https://schema.org/ItemListOrderAscending",
    itemListElement: listItems.map((item) => ref(item["@id"]))
  };

  return [itemList, ...listItems, ...productEntities, ...offers];
}

function faqNode() {
  return {
    "@id": `${SITE_URL}#faq`,
    "@type": "FAQPage",
    name: "Domande frequenti su massaggi a domicilio e oli essenziali",
    url: `${SITE_URL}#faq`,
    inLanguage: "it-IT",
    isPartOf: ref(`${SITE_URL}#webpage`),
    about: [ref(ORGANIZATION_ID), ref(PERSON_ID)],
    mainEntity: FAQ_DEFINITIONS.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.a
      }
    }))
  };
}

function digitalDocumentNode() {
  return {
    "@id": `${PDF_URL}#document`,
    "@type": "DigitalDocument",
    name: "L'Essenziale",
    url: PDF_URL,
    description: "Guida introduttiva agli oli essenziali pubblicata da comeleapi.",
    encodingFormat: "application/pdf",
    inLanguage: "it-IT",
    author: ref(ORGANIZATION_ID),
    publisher: ref(ORGANIZATION_ID),
    isPartOf: ref(`${SITE_URL}#website`),
    about: "Oli essenziali"
  };
}

export function buildHomeStructuredData(products) {
  if (!Array.isArray(products)) throw new Error("Il catalogo prodotti deve essere un array.");
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@id": `${SITE_URL}#website`,
        "@type": "WebSite",
        name: "comeleapi",
        url: SITE_URL,
        inLanguage: ["it-IT", "en"],
        publisher: ref(ORGANIZATION_ID)
      },
      {
        "@id": `${SITE_URL}#webpage`,
        "@type": "WebPage",
        name: "comeleapi — Massaggi a domicilio a Bresso e Milano Nord",
        alternateName: "comeleapi — Home massage & essential oils in Bresso and Milan North",
        url: SITE_URL,
        description: "Massaggi a domicilio a Bresso e nell'area di Milano Nord con Sara Bordenga: sportivo, decontratturante, relax e drenante. Oli essenziali Young Living e consulenze su misura.",
        inLanguage: ["it-IT", "en"],
        isPartOf: ref(`${SITE_URL}#website`),
        mainEntity: ref(ORGANIZATION_ID),
        primaryImageOfPage: ref(`${SITE_URL}#primary-image`),
        about: [
          ref(ORGANIZATION_ID),
          ref(PERSON_ID),
          ...SERVICE_DEFINITIONS.map((service) => ref(`${SITE_URL}#service-${service.slug}`)),
          ref(PRODUCTS_ID)
        ],
        hasPart: [ref(`${PDF_URL}#document`), ref(`${SITE_URL}#faq`)]
      },
      ...identityNodes(),
      ...serviceNodes(),
      ...productNodes(products),
      faqNode(),
      digitalDocumentNode()
    ]
  };
}

export function buildLinksStructuredData() {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@id": `${SITE_URL}#website`,
        "@type": "WebSite",
        name: "comeleapi",
        url: SITE_URL,
        inLanguage: ["it-IT", "en"],
        publisher: ref(ORGANIZATION_ID)
      },
      {
        "@id": `${SITE_URL}links/#webpage`,
        "@type": "WebPage",
        name: "comeleapi — Link utili",
        alternateName: "comeleapi — Useful links",
        url: `${SITE_URL}links/`,
        description: "I link utili di comeleapi: guida agli oli, essenze e trattamenti.",
        inLanguage: ["it-IT", "en"],
        isPartOf: ref(`${SITE_URL}#website`),
        about: ref(ORGANIZATION_ID),
        hasPart: ref(`${PDF_URL}#document`)
      },
      ...linksIdentityNodes(),
      digitalDocumentNode()
    ]
  };
}
