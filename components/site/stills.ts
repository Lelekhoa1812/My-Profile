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

import type { StaticImageData } from "next/image";
import fiveGIllus from "@/public/img/illustrations/5g.jpg";
import claraIllus from "@/public/img/illustrations/clara.jpg";
import codopticIllus from "@/public/img/illustrations/codoptic.jpg";
import cvaIllus from "@/public/img/illustrations/cva.jpg";
import golfIllus from "@/public/img/illustrations/golf.jpg";
import medswinIllus from "@/public/img/illustrations/medswin.jpg";
import me from "@/img/me.jpeg";
import rosterIllus from "@/public/img/illustrations/roster.jpg";
import salleIllus from "@/public/img/illustrations/salle.jpg";
import skyledgeIllus from "@/public/img/illustrations/skyledge.jpg";
import triageIllus from "@/public/img/illustrations/triage.jpg";
import writingIllus from "@/public/img/illustrations/writing.jpg";

export const STILLS: Record<string, StaticImageData> = {
  "5g.jpg": fiveGIllus,
  "clara.jpeg": claraIllus,
  "codoptic.jpeg": codopticIllus,
  "cva.png": cvaIllus,
  "golf.png": golfIllus,
  "ielts.png": writingIllus,
  "medswin.png": medswinIllus,
  "me.jpeg": me,
  "roster.jpg": rosterIllus,
  "salle.png": salleIllus,
  "skyledge.jpg": skyledgeIllus,
  "triage.jpeg": triageIllus,
};
