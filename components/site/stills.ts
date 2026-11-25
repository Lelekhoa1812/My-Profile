// Checked photographs. Unsplash licence allows use.
// clara → https://unsplash.com/photos/1530497610245-94d3c16cda28
// triage → https://unsplash.com/photos/1516549655169-df83a0774514
// codoptic → https://unsplash.com/photos/1558494949-ef010cbdcc31
// cva → https://unsplash.com/photos/pKy0s3aNbTk
// golf → https://unsplash.com/photos/1535131749006-b7f58c99034b
// roster → https://www.pexels.com/photo/person-writing-on-notebook-590020/
// salle → https://unsplash.com/photos/black-and-white-ocean-waves-359e7d316be0
// writing → https://www.pexels.com/photo/notebook-and-pen-on-table-733852/
// ericsson → https://unsplash.com/photos/1544197150-b99a580bb7a8
// medswin → https://unsplash.com/photos/1579154204601-01588f351e67
// skyledge → https://unsplash.com/photos/1486262715619-67b85e0b08d3
// meter → https://unsplash.com/photos/1513828583688-c52646db42da
// passport → https://unsplash.com/photos/1521295121783-8a321d551ad2
// market → https://unsplash.com/photos/1611974789855-9c2a0a7236a3
// router → https://unsplash.com/photos/1518770660439-4636190af475
// mic → https://unsplash.com/photos/1590602847861-f357a9332bbc
// clock → https://unsplash.com/photos/1501139083538-0139583c060f
// survey → https://unsplash.com/photos/1454165804606-c3d57bc86b40
// notes → https://unsplash.com/photos/1517245386807-bb43f82c33c4
// ledger → https://unsplash.com/photos/1554224155-6726b3ff858f

import type { StaticImageData } from "next/image";
import fiveGIllus from "@/public/img/illustrations/5g.jpg";
import claraIllus from "@/public/img/illustrations/clara.jpg";
import clockIllus from "@/public/img/illustrations/clock.jpg";
import codopticIllus from "@/public/img/illustrations/codoptic.jpg";
import cvaIllus from "@/public/img/illustrations/cva.jpg";
import golfIllus from "@/public/img/illustrations/golf.jpg";
import ledgerIllus from "@/public/img/illustrations/ledger.jpg";
import marketIllus from "@/public/img/illustrations/market.jpg";
import medswinIllus from "@/public/img/illustrations/medswin.jpg";
import me from "@/img/me.jpeg";
import meterIllus from "@/public/img/illustrations/meter.jpg";
import micIllus from "@/public/img/illustrations/mic.jpg";
import notesIllus from "@/public/img/illustrations/notes.jpg";
import passportIllus from "@/public/img/illustrations/passport.jpg";
import rosterIllus from "@/public/img/illustrations/roster.jpg";
import routerIllus from "@/public/img/illustrations/router.jpg";
import salleIllus from "@/public/img/illustrations/salle.jpg";
import skyledgeIllus from "@/public/img/illustrations/skyledge.jpg";
import surveyIllus from "@/public/img/illustrations/survey.jpg";
import triageIllus from "@/public/img/illustrations/triage.jpg";
import writingIllus from "@/public/img/illustrations/writing.jpg";

export const STILLS: Record<string, StaticImageData> = {
  "5g.jpg": fiveGIllus,
  "clara.jpeg": claraIllus,
  "clock.jpg": clockIllus,
  "codoptic.jpeg": codopticIllus,
  "cva.png": cvaIllus,
  "golf.png": golfIllus,
  "ielts.png": writingIllus,
  "ledger.jpg": ledgerIllus,
  "market.jpg": marketIllus,
  "medswin.png": medswinIllus,
  "me.jpeg": me,
  "meter.jpg": meterIllus,
  "mic.jpg": micIllus,
  "notes.jpg": notesIllus,
  "passport.jpg": passportIllus,
  "roster.jpg": rosterIllus,
  "router.jpg": routerIllus,
  "salle.png": salleIllus,
  "skyledge.jpg": skyledgeIllus,
  "survey.jpg": surveyIllus,
  "triage.jpeg": triageIllus,
};
