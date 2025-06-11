// In-memory cache to replace database operations and eliminate blocking
import type { Activity, Contact, QuickWin, Roadblock, User, Subtask } from "@shared/schema";

const cache = {
  activities: [
    {
      id: 1,
      title: "BIM-modellering woonproject Almere",
      description: "Ontwikkeling van gedetailleerd BIM-model voor duurzaam woonproject in Almere inclusief installaties en constructie.",
      status: "In Progress",
      priority: "High",
      deadline: new Date("2025-01-15"),
      createdAt: new Date("2024-12-01"),
      createdBy: 1,
      effort: "High",
      impact: "High",
      participants: ["b.weinreder@nijhuis.nl", "p.jansen@nijhuis.nl"],
      tags: ["BIM", "Woonbouw", "Almere"],
      linkedContactIds: [1, 2]
    },
    {
      id: 2,
      title: "Technische review kantoorgebouw Rotterdam",
      description: "Uitvoering van technische review en optimalisatie van installaties voor nieuw kantoorgebouw.",
      status: "Planning",
      priority: "Medium",
      deadline: new Date("2025-02-01"),
      createdAt: new Date("2024-12-05"),
      createdBy: 1,
      effort: "Medium",
      impact: "High",
      participants: ["b.weinreder@nijhuis.nl"],
      tags: ["Review", "Kantoor", "Rotterdam"],
      linkedContactIds: [3]
    },
    {
      id: 3,
      title: "Energieanalyse schoolgebouw Utrecht",
      description: "Energieprestatieberekening en advies voor verduurzaming van bestaand schoolgebouw.",
      status: "Completed",
      priority: "Low",
      deadline: new Date("2024-12-20"),
      createdAt: new Date("2024-11-15"),
      createdBy: 1,
      effort: "Low",
      impact: "Medium",
      participants: ["b.weinreder@nijhuis.nl", "m.de-vries@nijhuis.nl"],
      tags: ["Energie", "School", "Utrecht"],
      linkedContactIds: [4]
    },
    {
      id: 4,
      title: "Projectcoördinatie industriebouw Eindhoven",
      description: "Coördinatie van multidisciplinair team voor grote industriële ontwikkeling in Eindhoven.",
      status: "In Progress",
      priority: "High",
      deadline: new Date("2025-03-01"),
      createdAt: new Date("2024-12-10"),
      createdBy: 1,
      effort: "High",
      impact: "High",
      participants: ["b.weinreder@nijhuis.nl", "j.van-der-berg@nijhuis.nl"],
      tags: ["Industrie", "Coördinatie", "Eindhoven"],
      linkedContactIds: [1, 5]
    },
    {
      id: 5,
      title: "Duurzaamheidscertificering ziekenhuis Amsterdam",
      description: "Begeleiding van BREEAM-certificering voor nieuw ziekenhuiscomplex in Amsterdam.",
      status: "Planning",
      priority: "Medium",
      deadline: new Date("2025-04-15"),
      createdAt: new Date("2024-12-15"),
      createdBy: 1,
      effort: "Medium",
      impact: "High",
      participants: ["b.weinreder@nijhuis.nl"],
      tags: ["BREEAM", "Ziekenhuis", "Amsterdam"],
      linkedContactIds: [2, 3]
    }
  ] as Activity[],
  
  contacts: [
    {
      id: 1,
      name: "Pieter Jansen",
      email: "p.jansen@nijhuis.nl",
      phone: "+31 6 12345678",
      company: "Nijhuis Saur Industries",
      role: "Senior BIM Specialist",
      tags: ["BIM", "Woonbouw"],
      createdAt: new Date("2024-11-01"),
      createdBy: 1
    },
    {
      id: 2,
      name: "Maria de Vries",
      email: "m.de-vries@nijhuis.nl",
      phone: "+31 6 87654321",
      company: "Nijhuis Saur Industries",
      role: "Energieadviseur",
      tags: ["Energie", "Duurzaamheid"],
      createdAt: new Date("2024-11-05"),
      createdBy: 1
    },
    {
      id: 3,
      name: "Jan van der Berg",
      email: "j.van-der-berg@nijhuis.nl",
      phone: "+31 6 11223344",
      company: "Nijhuis Saur Industries",
      role: "Projectmanager",
      tags: ["Management", "Industrie"],
      createdAt: new Date("2024-11-10"),
      createdBy: 1
    },
    {
      id: 4,
      name: "Lisa Vermeulen",
      email: "l.vermeulen@gemeente-utrecht.nl",
      phone: "+31 30 2868686",
      company: "Gemeente Utrecht",
      role: "Bouwvergunningen",
      tags: ["Gemeente", "Vergunningen"],
      createdAt: new Date("2024-11-15"),
      createdBy: 1
    },
    {
      id: 5,
      name: "Thomas Bakker",
      email: "t.bakker@bam.nl",
      phone: "+31 6 99887766",
      company: "BAM Bouw en Techniek",
      role: "Hoofduitvoerder",
      tags: ["Uitvoering", "Bouw"],
      createdAt: new Date("2024-11-20"),
      createdBy: 1
    }
  ] as Contact[],
  
  quickwins: [
    {
      id: 1,
      title: "BIM-template updaten voor nieuwe projecten",
      description: "Standaard BIM-template bijwerken met nieuwste libraries en families",
      status: "Active",
      impact: "Medium",
      effort: "Low",
      linkedActivityId: 1,
      createdAt: new Date("2024-12-01"),
      createdBy: 1
    },
    {
      id: 2,
      title: "Energielabel database synchroniseren",
      description: "Lokale database energielabels synchroniseren met landelijke database",
      status: "Active",
      impact: "Low",
      effort: "Low",
      linkedActivityId: 3,
      createdAt: new Date("2024-12-05"),
      createdBy: 1
    },
    {
      id: 3,
      title: "BREEAM checklist maken",
      description: "Uitgebreide checklist opstellen voor BREEAM-certificering projecten",
      status: "Active",
      impact: "High",
      effort: "Low",
      linkedActivityId: 5,
      createdAt: new Date("2024-12-10"),
      createdBy: 1
    },
    {
      id: 4,
      title: "Contactgegevens leveranciers updaten",
      description: "Alle leverancierscontacten controleren en bijwerken waar nodig",
      status: "Completed",
      impact: "Low",
      effort: "Low",
      linkedActivityId: 4,
      createdAt: new Date("2024-12-12"),
      createdBy: 1
    }
  ] as QuickWin[],
  
  roadblocks: [] as Roadblock[],
  subtasks: [] as Subtask[],
  
  users: [
    {
      id: 1,
      email: "b.weinreder@nijhuis.nl",
      name: "Bram Weinreder",
      role: "admin",
      createdAt: new Date("2024-11-01")
    }
  ] as User[]
};

export function getCachedActivities(): Activity[] {
  return cache.activities;
}

export function getCachedContacts(): Contact[] {
  return cache.contacts;
}

export function getCachedQuickWins(): QuickWin[] {
  return cache.quickwins;
}

export function getCachedRoadblocks(): Roadblock[] {
  return cache.roadblocks;
}

export function getCachedSubtasks(): Subtask[] {
  return cache.subtasks;
}

export function getCachedUsers(): User[] {
  return cache.users;
}

export function getCachedStats() {
  const activities = cache.activities;
  const urgentCount = activities.filter(a => a.priority === "High").length;
  const dueThisWeek = activities.filter(a => {
    const deadline = new Date(a.deadline);
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    return deadline <= nextWeek;
  }).length;
  const completedCount = activities.filter(a => a.status === "Completed").length;
  const activeContacts = cache.contacts.length;

  return {
    urgentCount,
    dueThisWeek,
    completedCount,
    activeContacts
  };
}