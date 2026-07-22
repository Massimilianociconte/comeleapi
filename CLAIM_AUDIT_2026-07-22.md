# comeleapi — Audit dei claim visibili

Data: 22 luglio 2026
Stato: audit editoriale; nessuna alternativa è stata applicata al front-end o al PDF

## Metodo e limiti

La classificazione riguarda le frasi sensibili presenti nella homepage, nel catalogo e nelle sette pagine della guida. Le frasi puramente identificative, i nomi dei servizi, i prezzi, i contatti e le istruzioni di navigazione non sono claim di efficacia e non vengono ripetuti qui.

Livelli:

- `D`: descrittivo o sensoriale;
- `S`: esperienza soggettiva o slogan;
- `B`: claim generale di benessere;
- `C`: claim cosmetico;
- `F`: claim fisiologico;
- `M`: claim medico o facilmente interpretabile come tale;
- `Q`: qualifica professionale;
- `U`: non verificato nei materiali disponibili.

Il controllo usa come cornice prudenziale i criteri comuni UE per i claim cosmetici, le regole UE sulla pubblicità dei biocidi e le pratiche commerciali sleali. La disciplina effettiva dipende dalla classificazione, etichetta, modalità d'uso e documentazione del singolo prodotto: questo report non sostituisce revisione scientifica o legale.

Fonti primarie di riferimento:

- [Regolamento (UE) n. 655/2013 sui criteri comuni per i claim cosmetici](https://eur-lex.europa.eu/eli/reg/2013/655/oj);
- [Regolamento (UE) n. 528/2012 sui biocidi](https://eur-lex.europa.eu/eli/reg/2012/528/oj);
- [Direttiva 2005/29/CE sulle pratiche commerciali sleali](https://eur-lex.europa.eu/eli/dir/2005/29/oj);
- etichetta, scheda tecnica, istruzioni e documentazione ufficiale Young Living del prodotto specifico, ancora da associare frase per frase.

## Homepage

| Sezione | Claim corrente | Tipo | Evidenza disponibile | Rischio | Alternativa proposta, non applicata |
|---|---|---:|---|---|---|
| Hero | “Vola verso il tuo benessere” | S/B | slogan di brand | basso se resta aspirazionale | può restare come slogan, senza collegarlo a risultati clinici |
| Oli | “Essenze pure, benessere autentico” | B/U | nessun certificato di purezza associato nel progetto | medio | “Oli essenziali e kit Young Living selezionati da Sara” |
| Oli | “Ti accompagnano ogni giorno verso equilibrio, energia e vitalità” | B/F/U | nessuna prova associata alla frase | alto | “Una selezione per i tuoi rituali aromatici quotidiani” |
| Signature Blend | “gli oli essenziali più adatti alle tue esigenze” | B/U | ruolo di rivenditrice confermato; criteri di consulenza e limiti non documentati | medio-alto | “insieme esploreremo profumi e preferenze, seguendo sempre etichette e istruzioni ufficiali” |
| Servizi | “Un contatto che ascolta il corpo e lo accompagna verso il suo equilibrio” | B/F/U | formulazione metaforica, ma riferita a un trattamento | medio | “Un trattamento manuale orientato al comfort e all'ascolto personale” |
| Missione | “oli essenziali puri e trattamenti naturali che riportano l'organismo al suo equilibrio originario” | F/M/U | nessuna prova clinica o definizione di “equilibrio originario” | critico | “oli essenziali e trattamenti che Sara seleziona per rituali personali di benessere” |
| Profilo | “Il corpo è una macchina perfetta” | S/U | opinione personale assoluta | medio | “Per Sara, ascoltare il corpo è parte della cura quotidiana di sé” |
| Profilo | “Se lo ascolti e lo nutri con amore, ti dona benessere” | B/F/U | nessuna prova; causalità implicita | alto | “Ascolto e attenzione quotidiana possono far parte di un percorso personale di benessere” |
| Profilo | “L'equilibrio è la chiave della salute” | M/U | claim sanitario assoluto | critico | “L'equilibrio personale è uno dei valori che guidano il progetto” |
| Profilo | “Sara è stata atleta professionista fin da piccola” | D/U | dichiarazione biografica, documentazione non presente | medio reputazionale | “Lo sport fa parte del percorso personale di Sara”, finché non documentato il livello professionistico |
| Profilo | “il corpo non mente mai” | S | frase soggettiva | basso-medio | “lo sport le ha insegnato ad ascoltare i segnali del corpo” |
| Profilo | “è l'unico vero segreto per stare bene” | B/U | assoluto non dimostrato | alto | “sono abitudini che Sara considera importanti per il proprio benessere” |
| Profilo | “Massaggi e oli essenziali … capaci di riportare l'organismo al suo equilibrio” | F/M/U | efficacia fisiologica non documentata | critico | “Massaggi e oli essenziali fanno parte della proposta di benessere di Sara” |
| Profilo | “aiutarti a ritrovare energia e vitalità” | B/F/U | risultato promesso non documentato | alto | “aiutarti a scegliere un trattamento coerente con preferenze ed esigenze dichiarate” |
| Formazione | “Diploma professionale”, “Aromaterapia”, “Igiene e sicurezza” | Q/U | discordanti rispetto alla qualifica comunicata nel 2026 | alto | dopo approvazione visibile: usare soltanto la denominazione documentata “Massaggio sportivo di 2° livello (2026)” |

Le descrizioni neutre inserite nel JSON-LD non riprendono nessuno dei claim sanitari sopra.

## Catalogo prodotti

| Prodotto | Claim corrente sensibile | Tipo | Evidenza disponibile | Rischio | Alternativa proposta, non applicata |
|---|---|---:|---|---|---|
| Collezione Essenziale | “adatti a coprire tutte le esigenze della vita quotidiana” | B/U | nessuna documentazione associata | medio-alto, assoluto | “starter kit composto da 12 oli essenziali Young Living” |
| Baby Essentials | “perfetti per i più piccoli”; “sicurezza … per tutta la famiglia” | M/U | nessuna etichetta o istruzione pediatrica associata | critico | “kit Baby Essentials con prodotti prediluiti; uso esclusivamente secondo etichetta e indicazioni del produttore” |
| Sweet Home | “pulizia profonda e zero tossine”; “ambiente sano e sicuro” | F/U | nessuna prova o classificazione biocida associata | critico | “kit Young Living pensato per la routine domestica” |
| Dolce Notte | “rituale perfetto per notti serene”; “buon riposo” | B/F/U | nessuna prova associata | alto | “selezione aromatica pensata per un rituale serale” |
| Sport | “Energia, performance e risultati”; “recuperare al meglio” | F/M/U | nessuna prova sportiva o clinica associata | critico | “kit Young Living presentato per routine legate all'attività sportiva” |
| Per lui | “pensato su misura per l'uomo moderno” | D/S | copy promozionale | basso | “selezione per la routine quotidiana” |
| Per lei | “routine … rigenerante” | C/U | nessuna prova cosmetica associata | medio | “selezione per una routine cosmetica quotidiana” |
| Animali | “benessere”; “coccole naturali sicure e su misura” | M/U | nessuna istruzione veterinaria o scheda di sicurezza associata | critico | “linea Animal Scents; verificare specie, diluizione e uso nelle istruzioni ufficiali e con il veterinario” |
| BALANCE skin | “equilibrio naturale della pelle”; “Pura” | C/U | nessun dossier cosmetico associato | alto | “kit cosmetico BALANCE skin di Young Living” |
| Bloom | “pelle … rigenerata”; “scudo naturale contro gli agenti esterni” | C/F/U | nessun dossier cosmetico associato | alto | “kit cosmetico Bloom per la routine di idratazione” solo se coerente con etichetta ufficiale |
| Shine Bright | “viso tonico e sguardo luminoso” | C/U | nessun dossier cosmetico associato | medio-alto | “duo cosmetico Shine Bright di Young Living” |
| Menopausa | “alleato naturale”; “equilibrio, energia e serenità” | F/M/U | nessuna prova o istruzione associata; target sensibile | critico | “kit denominato Menopausa nel catalogo collegato”, senza promessa di effetto |

I `Product` e gli `Offer` strutturati usano nome, immagine, prezzo, URL e una descrizione editoriale neutra; non importano le descrizioni sensibili del catalogo.

## PDF — pagina per pagina

| Pagina | Claim corrente sensibile | Tipo | Evidenza disponibile | Rischio | Alternativa proposta, non applicata |
|---:|---|---:|---|---|---|
| 2 | “Il tuo corpo sa come stare bene” e capacità di ritrovare l'equilibrio naturale | B/F/U | nessuna fonte associata | alto | presentare il benessere come esperienza personale, non come capacità fisiologica garantita |
| 2 | “possiede tutte le risorse per prendersi cura di sé” | M/U | assoluto non dimostrato; può scoraggiare assistenza sanitaria | critico | “abitudini e supporti adeguati possono contribuire alla cura quotidiana di sé” |
| 2 | oli “altamente biocompatibili”, “rapidamente assorbiti con efficacia” | F/M/U | nessuna fonte, dose o via d'uso associata | critico | descrivere soltanto che sono miscele aromatiche volatili e rinviare all'etichetta per l'uso |
| 2 | “sostenendo il benessere fisico ed emotivo” | F/M/U | nessuna evidenza associata | alto | “utilizzati in rituali aromatici personali; le esperienze soggettive possono variare” |
| 2 | “supporto concreto” per equilibrio, energia e serenità | B/F/U | risultato implicito non dimostrato | alto | “una guida introduttiva per conoscere profumi e modalità d'uso dichiarate” |
| 3 | “vero e proprio sistema di difesa naturale” e comunicazione | D/F/U | plausibilità botanica generale, ma senza fonte e con generalizzazione | medio | “nelle piante, i composti volatili possono svolgere diverse funzioni ecologiche” con fonte scientifica |
| 3 | “intelligenza botanica”; “principi attivi potenti” | F/M/U | linguaggio antropomorfico e farmacologico non documentato | alto | “ogni olio ha una composizione caratteristica da valutare prodotto per prodotto” |
| 3 | “alleati naturali per il proprio benessere” | B/U | tradizione non equivale a efficacia | medio-alto | “usati in diversi contesti aromatici e tradizionali”, con fonte e limiti |
| 4 | “Bastano pochi istanti … comincino ad agire” | F/M/U | nessuna dose, via o outcome | critico | eliminare il tempo d'azione; descrivere soltanto volatilità e percezione olfattiva |
| 4 | molecole che “penetrano … pelle e vie respiratorie” raggiungendo l'organismo | F/M/U | generalizzazione di esposizione/assorbimento | critico | rinviare alle modalità d'uso e avvertenze del prodotto specifico |
| 4 | “dialogano direttamente con le aree cerebrali” | F/M/U | semplificazione neuroscientifica | critico | “gli odori vengono percepiti dal sistema olfattivo e possono evocare sensazioni e ricordi soggettivi” |
| 4 | “toccando corpo e mente” | B/F/U | efficacia generalizzata | alto | “l'esperienza olfattiva è personale e può variare” |
| 5 | “Il corpo assorbe tutte le sostanze con cui entra in contatto” | F/M/U | falso assoluto | critico | “l'esposizione dipende da sostanza, dose, via, formulazione e tempo di contatto” |
| 5 | molti oli “sintetici” o “contaminati da solventi chimici” | U | comparazione generalizzata senza campione o fonte | critico | “composizione e qualità variano; consultare etichetta, tracciabilità e documentazione del lotto” |
| 5 | “puri al 100%” | U | certificato/metodo analitico non associato | alto | usare percentuali soltanto con definizione, metodo e prova del prodotto specifico |
| 5 | “conservare intatto tutto il potere della pianta” | F/M/U | claim vago di potenza/efficacia | alto | “preservare il profilo aromatico dichiarato”, se documentato |
| 6 | Limone: “dona chiarezza e buonumore” | B/F/U | nessuna fonte associata | alto | “profilo olfattivo fresco e agrumato” |
| 6 | Lavanda: “calmante e distensivo” | F/M/U | nessuna modalità d'uso o prova associata | alto | “profilo olfattivo floreale, comunemente associato a rituali rilassanti” |
| 6 | Menta Piperita: “tonico” | F/U | effetto non definito | medio-alto | “profilo olfattivo fresco e mentolato” |
| 6 | Arancio: “infonde allegria” | B/F/U | effetto emotivo promesso | medio | “profilo olfattivo dolce e agrumato” |
| 6 | Frankincense: “aiuta meditazione e raccoglimento” | B/U | esperienza soggettiva | medio | “profilo legnoso e balsamico, scelto da alcune persone per rituali contemplativi” |
| 7 | Purification: “purifica l'aria” | F/U | può implicare efficacia biocida; nessuna prova associata | critico | “blend dal profilo fresco di citronella e lavanda”, se composizione verificata |
| 7 | R.C.: “per un respiro libero” | M/U | claim respiratorio | critico | “blend dal profilo balsamico” |
| 7 | Blue Relief: “utile dopo lo sforzo fisico” | F/M/U | beneficio post-sforzo non documentato | critico | “blend dal profilo resinoso e floreale” |
| 7 | DiGize: “aiuta il comfort digestivo” | M/U | claim digestivo | critico | “blend dal profilo speziato” |
| 7 | Stress Away: “dona conforto” | B/U | esperienza soggettiva | medio | “mix dal profilo agrumato e floreale” |
| 7 | Thieves: “protettivo” | F/M/U | protezione non definita; possibile lettura antimicrobica | critico | “blend dal profilo speziato di cannella e chiodi di garofano” |

La frase finale che invita a chiedere un parere qualificato è prudente, ma non rende dimostrati i claim precedenti.

## Decisione operativa

- Nessuna frase visibile è stata cambiata, come richiesto.
- Metadata e JSON-LD usano descrizioni neutrali e non amplificano i claim.
- Le alternative sono bozze conservative: prima della pubblicazione servono conferma editoriale, documentazione Young Living del singolo prodotto e revisione scientifica/legale coerente con la categoria d'uso.
- Una versione HTML della guida non è stata creata perché non è possibile riprodurne fedelmente il design responsive senza un nuovo progetto e relativa approvazione.
