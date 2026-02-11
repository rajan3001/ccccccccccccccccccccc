import type { Express, Request, Response } from "express";
import { isAuthenticated } from "./replit_integrations/auth";
import { db } from "./db";
import {
  timetableSlots,
  syllabusTopics,
  userSyllabusProgress,
  dailyStudyGoals,
  quizAttempts,
  quizQuestions,
} from "@shared/schema";
import { eq, and, sql, desc } from "drizzle-orm";
import { z } from "zod";
import { GoogleGenAI } from "@google/genai";
import { getUserLanguage, getLanguageInstruction, getLanguageName } from "./language-utils";

type SyllabusSection = { parent: string; topics: string[] };
type ExamSyllabus = { examType: string; papers: { gsPaper: string; topics: SyllabusSection[] }[] };

const ALL_EXAM_SYLLABI: ExamSyllabus[] = [
  {
    examType: "UPSC",
    papers: [
      {
        gsPaper: "GS Paper I",
        topics: [
          { parent: "Indian Heritage & Culture", topics: ["Indian Culture - Salient Aspects", "Art Forms", "Literature", "Architecture", "Ancient Indian History", "Medieval Indian History", "Modern Indian History", "Freedom Struggle - Various Stages", "Important Contributors & Their Contributions", "Post-Independence Consolidation", "Reorganization of States"] },
          { parent: "World History", topics: ["Industrial Revolution", "World Wars & Their Impact", "Colonization & Decolonization", "Political Philosophies - Communism, Capitalism, Socialism", "Redrawing of National Boundaries", "Impact of World Events on India"] },
          { parent: "Indian Society", topics: ["Salient Features of Indian Society", "Diversity of India", "Role of Women & Women's Organizations", "Population & Associated Issues", "Poverty & Developmental Issues", "Urbanization - Problems & Remedies", "Effects of Globalization on Indian Society", "Social Empowerment", "Communalism, Regionalism & Secularism"] },
          { parent: "Geography", topics: ["Physical Geography - Geomorphology", "Climatology & Oceanography", "Indian Physical Geography", "Indian Economic Geography", "World Geography - Major Natural Resources", "Geophysical Phenomena - Earthquakes, Tsunami, Volcanoes", "Geographical Features & Their Location", "Changes in Critical Geographical Features", "Factors Responsible for Location of Industries"] },
        ],
      },
      {
        gsPaper: "GS Paper II",
        topics: [
          { parent: "Governance & Constitution", topics: ["Indian Constitution - Historical Underpinnings", "Evolution & Features of Constitution", "Amendments & Basic Structure", "Functions & Responsibilities of Union & States", "Separation of Powers - Disputes & Redressal", "Federal Structure - Issues & Challenges", "Parliament & State Legislatures - Structure & Functioning", "Powers & Privileges of Legislature"] },
          { parent: "Polity & Governance", topics: ["Executive & Judiciary - Structure & Functioning", "Statutory, Regulatory & Quasi-Judicial Bodies", "Representation of People's Act", "Appointment to Various Constitutional Bodies", "Government Policies & Interventions", "Development Processes & Development Industry", "E-Governance - Applications & Limitations", "Role of Civil Services"] },
          { parent: "Social Justice", topics: ["Welfare Schemes - Performance & Mechanisms", "Issues Relating to Poverty & Hunger", "Mechanisms for Vulnerable Sections", "Issues Relating to Education", "Issues Relating to Health", "Labour & Employment", "Issues relating to SCs, STs, OBCs, Minorities & PWDs"] },
          { parent: "International Relations", topics: ["India & Its Neighbors - Relations", "Bilateral, Regional & Global Groupings", "Effect of Policies on India's Interests", "Important International Institutions & Agencies", "Indian Diaspora", "Geopolitics of South Asia", "Geopolitics of Indo-Pacific Region"] },
        ],
      },
      {
        gsPaper: "GS Paper III",
        topics: [
          { parent: "Indian Economy", topics: ["Indian Economy - Growth & Development", "Inclusive Growth & Issues", "Government Budgeting", "Mobilization of Resources", "Agriculture - Issues & Reforms", "Food Processing & Related Industries", "Land Reforms in India", "Effects of Liberalization on Economy", "Infrastructure - Energy, Ports, Roads, Airports", "Investment Models - PPP"] },
          { parent: "Science & Technology", topics: ["Developments in Science & Technology", "Indigenization of Technology", "Achievements of Indians in S&T", "Awareness in IT, Space, Computers", "Robotics & Nano-technology", "Bio-technology & Issues", "Intellectual Property Rights"] },
          { parent: "Environment & Ecology", topics: ["Conservation & Environmental Pollution", "Environmental Impact Assessment", "Biodiversity & Its Conservation", "Climate Change & Its Impact", "Wildlife Protection & Laws", "Environmental Organizations & Treaties", "Sustainable Development Goals"] },
          { parent: "Internal Security", topics: ["Internal Security Challenges & Threats", "Linkages of Organized Crime & Terrorism", "Role of External State & Non-State Actors", "Border Management & Challenges", "Cyber Security - Threats & Framework", "Money Laundering & Its Prevention", "Security Forces & Agencies - Mandate & Role", "Role of Media & Social Media in Internal Security"] },
          { parent: "Disaster Management", topics: ["Disaster Management - Framework & Institutions", "Disaster Preparedness & Response", "Disaster Mitigation Strategies", "Community-Based Disaster Management", "Sendai Framework & India's NDMA"] },
        ],
      },
      {
        gsPaper: "GS Paper IV",
        topics: [
          { parent: "Ethics & Human Interface", topics: ["Ethics & Human Values - Lessons from Lives of Great Leaders", "Role of Family, Society & Educational Institutions", "Attitude - Content, Structure & Function", "Emotional Intelligence - Concepts & Application", "Moral & Political Attitudes", "Contributions of Moral Thinkers - Indian & Western", "Public/Civil Service Values & Ethics in Public Administration", "Ethical Issues in International Relations & Funding"] },
          { parent: "Aptitude & Integrity", topics: ["Aptitude & Foundational Values for Civil Service", "Integrity in Public Service", "Philosophical Basis of Governance & Probity", "Information Sharing & Transparency in Government", "Right to Information & Citizen Charters", "Code of Ethics & Code of Conduct", "Work Culture & Quality of Service Delivery", "Utilization of Public Funds - Challenges & Ethics", "Ethical Concerns & Dilemmas - Case Studies"] },
        ],
      },
    ],
  },
  {
    examType: "JPSC",
    papers: [
      {
        gsPaper: "GS Paper I",
        topics: [
          { parent: "Indian History & Culture", topics: ["Ancient India - Indus Valley, Vedic Age", "Medieval Indian History - Delhi Sultanate, Mughals", "Modern Indian History - British Rule, Reform Movements", "Indian National Movement - Phases & Leaders", "Indian Art, Architecture & Literature", "Cultural Heritage of India"] },
          { parent: "Geography of India & World", topics: ["Physical Geography of India", "Indian Climate & Monsoon", "Soil Types & Natural Vegetation", "Drainage Systems of India", "World Geography - Continents, Oceans", "Geographical Phenomena & Natural Disasters"] },
        ],
      },
      {
        gsPaper: "GS Paper II",
        topics: [
          { parent: "Governance & Polity", topics: ["Indian Constitution - Features & Amendments", "Fundamental Rights & Duties", "Directive Principles of State Policy", "Union & State Government - Structure", "Judiciary - Structure & Functions", "Panchayati Raj & Local Governance", "Public Policy & Rights Issues"] },
          { parent: "Social Issues", topics: ["Population & Urbanization", "Poverty & Unemployment", "Education - Issues & Policies", "Health - Issues & Policies", "Women Empowerment & Gender Issues", "Child Development & Welfare", "Social Justice & Inclusive Growth"] },
        ],
      },
      {
        gsPaper: "GS Paper III",
        topics: [
          { parent: "Science & Technology", topics: ["Developments in Science & Technology", "IT & Computer Applications", "Space Technology & ISRO", "Biotechnology & Genetic Engineering", "Nanotechnology & Robotics", "Environmental Science & Ecology", "Climate Change & Sustainable Development"] },
          { parent: "Economy", topics: ["Indian Economy - Planning & Development", "Agriculture & Rural Development", "Industrial Policy & Growth", "Banking & Financial System", "Foreign Trade & BOP", "Economic Reforms & Liberalization"] },
        ],
      },
      {
        gsPaper: "Jharkhand Special",
        topics: [
          { parent: "Jharkhand History & Culture", topics: ["History of Jharkhand - Ancient to Modern", "Tribal Movements in Jharkhand", "Birsa Munda & Tribal Heroes", "Jharkhand Movement for Statehood", "Cultural Heritage of Jharkhand", "Tribal Art, Dance & Music", "Languages & Dialects of Jharkhand"] },
          { parent: "Jharkhand Geography & Economy", topics: ["Physical Geography of Jharkhand", "Mineral Resources & Mining Industry", "Forests & Wildlife of Jharkhand", "Rivers & Water Resources", "Agriculture in Jharkhand", "Industrial Development & SEZs", "Tourism & Heritage Sites", "Demographic Profile & Urbanization"] },
          { parent: "Jharkhand Governance", topics: ["Administrative Structure of Jharkhand", "Panchayati Raj in Jharkhand (PESA Act)", "Tribal Welfare Schemes", "Fifth Schedule Areas", "Jharkhand State Policies & Programs", "Current Issues in Jharkhand Development"] },
        ],
      },
    ],
  },
  {
    examType: "BPSC",
    papers: [
      {
        gsPaper: "GS Paper I",
        topics: [
          { parent: "Indian History & Culture", topics: ["Ancient India - Magadha Empire, Mauryas, Guptas", "Medieval India - Delhi Sultanate, Provincial Dynasties", "Modern India - British Period, National Movement", "Indian Art & Architecture", "Indian Literature & Philosophy", "Cultural Traditions of India"] },
          { parent: "Geography", topics: ["Physical Geography - Landforms, Climate", "Indian Geography - Physical & Economic", "World Geography - Major Features", "Environmental Issues & Conservation", "Resource Distribution & Management"] },
        ],
      },
      {
        gsPaper: "GS Paper II",
        topics: [
          { parent: "Indian Polity & Governance", topics: ["Indian Constitution - Salient Features", "Amendment Process & Basic Structure", "Fundamental Rights, Duties & DPSP", "Union Executive & Legislature", "State Executive & Legislature", "Judiciary & Judicial Review", "Federal Structure & Centre-State Relations", "Local Self Government & Panchayati Raj", "Constitutional & Statutory Bodies", "Governance & Public Policy"] },
          { parent: "Indian Economy & Social Development", topics: ["Economic Planning & NITI Aayog", "Agriculture & Food Security", "Industry & Infrastructure", "Banking, Finance & Insurance", "Foreign Trade & International Organizations", "Population, Poverty & Unemployment", "Social Sector Initiatives", "Education & Health Policies"] },
          { parent: "Science & Technology", topics: ["Developments in S&T in India", "Space & Defense Technology", "IT & Communication", "Biotechnology & Health Sciences", "Energy Resources & Nuclear Policy"] },
        ],
      },
      {
        gsPaper: "Bihar Special",
        topics: [
          { parent: "Bihar History", topics: ["Ancient Bihar - Magadha, Nalanda, Vikramshila", "Medieval Bihar - Sher Shah Suri, Provincial Rule", "Bihar in Freedom Struggle - Champaran, Quit India", "Post-Independence Bihar & Statehood", "Separate Jharkhand Movement & Bihar Reorganization"] },
          { parent: "Bihar Geography & Economy", topics: ["Physical Geography of Bihar - Plains, Rivers", "Climate & Natural Vegetation", "Mineral & Water Resources", "Agriculture & Irrigation in Bihar", "Industrial Development in Bihar", "Bihar's Economy - GDP, Sectors, Growth", "Transport & Communication Infrastructure"] },
          { parent: "Bihar Society & Culture", topics: ["Demographic Profile of Bihar", "Tribal Communities in Bihar", "Art, Culture & Festivals of Bihar", "Languages & Literature of Bihar", "Tourism & Heritage Sites", "Bihar Government Welfare Schemes", "Current Developmental Issues in Bihar"] },
        ],
      },
    ],
  },
  {
    examType: "JKPSC",
    papers: [
      {
        gsPaper: "GS Paper I",
        topics: [
          { parent: "History & Culture", topics: ["Ancient India - Civilizations & Empires", "Medieval India - Sultanates & Mughals", "Modern India - Colonial Period & National Movement", "World History - Major Events", "Indian Art, Architecture & Literature", "Cultural Heritage & Traditions"] },
          { parent: "Geography", topics: ["Physical Geography - Earth & Processes", "Indian Geography - Physical & Economic", "World Geography - Major Features", "Climatology & Oceanography", "Environmental Issues"] },
          { parent: "Indian Society", topics: ["Diversity & Pluralism", "Social Issues - Poverty, Education, Health", "Role of Women & Empowerment", "Population & Urbanization", "Globalization & Its Effects"] },
        ],
      },
      {
        gsPaper: "GS Paper II",
        topics: [
          { parent: "Polity & Governance", topics: ["Indian Constitution - Features & Amendments", "Fundamental Rights, DPSP & Duties", "Union & State Government", "Judiciary & Judicial Activism", "Federalism & Centre-State Relations", "Local Government & Panchayati Raj", "Government Policies & Schemes", "E-Governance & Transparency"] },
          { parent: "International Relations", topics: ["India's Foreign Policy", "India & Its Neighbors", "International Organizations - UN, WTO, IMF", "Regional Groupings - SAARC, BRICS, ASEAN"] },
        ],
      },
      {
        gsPaper: "GS Paper III",
        topics: [
          { parent: "Economy & Development", topics: ["Indian Economy - Growth & Planning", "Agriculture & Food Security", "Industry & Infrastructure", "Banking & Financial Inclusion", "Fiscal & Monetary Policy", "International Trade & BOP"] },
          { parent: "Science, Technology & Environment", topics: ["Science & Technology Developments", "Space & Defense Technology", "IT, Biotechnology & Nanotechnology", "Environmental Conservation", "Climate Change & Agreements", "Disaster Management"] },
          { parent: "Security", topics: ["Internal Security Challenges", "Border Management", "Cyber Security", "Organized Crime & Terrorism", "Role of Security Forces"] },
        ],
      },
      {
        gsPaper: "GS Paper IV",
        topics: [
          { parent: "Ethics & Integrity", topics: ["Ethics & Human Values", "Emotional Intelligence", "Public Service Ethics", "Integrity & Probity in Governance", "Case Studies on Ethical Dilemmas"] },
        ],
      },
      {
        gsPaper: "J&K Special",
        topics: [
          { parent: "J&K History & Culture", topics: ["Ancient History of Kashmir - Karkota, Lohara Dynasties", "Medieval Kashmir - Sultanate Period, Shah Mir Dynasty", "Dogra Rule & Modern J&K History", "J&K Accession & Political History Post-1947", "Cultural Heritage - Art, Handicrafts, Architecture", "Languages & Literature of J&K", "Festivals & Traditions"] },
          { parent: "J&K Geography & Economy", topics: ["Physical Geography - Himalayas, Valleys, Rivers", "Climate & Natural Vegetation", "Agriculture & Horticulture", "Tourism & Handicrafts Industry", "Mineral Resources", "Economic Development Challenges", "Infrastructure & Connectivity"] },
          { parent: "J&K Governance", topics: ["Administrative Structure Post-Reorganization", "UT Administration & Governance", "J&K Development Policies & Programs", "Security & Border Issues", "Current Development Issues"] },
        ],
      },
    ],
  },
  {
    examType: "UPPSC",
    papers: [
      {
        gsPaper: "GS Paper I",
        topics: [
          { parent: "Indian History & Culture", topics: ["Ancient India - Indus Valley to Guptas", "Medieval India - Delhi Sultanate, Mughals", "Modern India - British Rule, Social Reforms", "National Movement - Phases & Leaders", "Indian Art, Architecture & Sculpture", "Literature & Cultural Heritage"] },
          { parent: "Geography", topics: ["Physical Geography - Landforms, Climate", "Indian Geography - Rivers, Soils, Vegetation", "Economic Geography - Resources, Industries", "World Geography - Major Features", "Environmental Issues & Conservation"] },
          { parent: "Indian Society", topics: ["Social Structure & Diversity", "Women's Issues & Empowerment", "Population & Urbanization", "Poverty & Inequality", "Globalization Effects on Society"] },
        ],
      },
      {
        gsPaper: "GS Paper II",
        topics: [
          { parent: "Polity & Governance", topics: ["Indian Constitution - Features & Amendments", "Fundamental Rights, DPSP & Duties", "Union, State & Local Government", "Judiciary - Structure & Role", "Constitutional Bodies", "Government Policies & Welfare Schemes", "E-Governance & Good Governance", "Role of Civil Services"] },
          { parent: "International Relations", topics: ["India's Foreign Policy", "India-Neighbor Relations", "International Organizations", "Bilateral & Regional Groupings"] },
          { parent: "Social Justice", topics: ["Welfare Schemes & Programs", "Issues of Marginalized Sections", "Education & Health Policies", "Labour & Employment Issues"] },
        ],
      },
      {
        gsPaper: "GS Paper III",
        topics: [
          { parent: "Economy", topics: ["Indian Economy - Planning & Development", "Agriculture & Food Processing", "Industrial Policy & Growth", "Infrastructure Development", "Banking & Financial System", "Foreign Trade & Investment", "Fiscal & Monetary Policy"] },
          { parent: "Science & Technology", topics: ["S&T Developments in India", "Space & Nuclear Technology", "IT & Communication", "Biotechnology & Genetic Engineering", "IPR & Innovation"] },
          { parent: "Environment & Disaster Management", topics: ["Environmental Pollution & Conservation", "Climate Change & Impact", "Biodiversity Conservation", "Disaster Management Framework", "National & State Disaster Policies"] },
          { parent: "Internal Security", topics: ["Internal Security Challenges", "Border Management", "Cyber Security & Information Warfare", "Role of Military & Para-Military", "Linkages of Organized Crime & Terrorism"] },
        ],
      },
      {
        gsPaper: "GS Paper IV",
        topics: [
          { parent: "Ethics & Values", topics: ["Ethics - Basics & Applications", "Emotional Intelligence", "Contributions of Moral Thinkers", "Public Service Values", "Integrity & Probity", "Case Studies on Ethical Issues"] },
        ],
      },
      {
        gsPaper: "UP Special Paper I",
        topics: [
          { parent: "UP History & Culture", topics: ["Ancient UP - Kashi, Kaushambi, Mathura", "Medieval UP - Mughal Empire, Lucknow Nawabs", "UP in Freedom Struggle - 1857, Chauri Chaura, Kakori", "Post-Independence UP - Political History", "Cultural Heritage - Art, Music, Dance", "Languages & Literature of UP", "Religious & Pilgrimage Centers"] },
          { parent: "UP Geography", topics: ["Physical Geography - Gangetic Plains, Vindhyas", "River Systems - Ganga, Yamuna, Gomti", "Climate & Soil Types", "Forests & Wildlife Sanctuaries", "Natural Resources & Minerals"] },
        ],
      },
      {
        gsPaper: "UP Special Paper II",
        topics: [
          { parent: "UP Economy & Governance", topics: ["UP Economy - GDP, Sectors, Growth", "Agriculture & Irrigation", "Industrial Development & MSME", "Infrastructure & Urban Development", "UP Government Policies & Schemes", "Panchayati Raj in UP", "Administrative Structure", "Current Development Issues in UP", "Tourism Development in UP", "Demographic Profile & Social Indicators"] },
        ],
      },
    ],
  },
  {
    examType: "MPPSC",
    papers: [
      {
        gsPaper: "GS Paper I",
        topics: [
          { parent: "History & Culture", topics: ["Ancient India - Civilizations & Empires", "Medieval India - Regional Kingdoms", "Modern India - British Period & National Movement", "Indian Art, Architecture & Heritage", "World History - Important Events"] },
          { parent: "Geography", topics: ["Physical Geography - Earth Sciences", "Indian Geography - Physical & Economic", "World Geography", "Environmental Issues & Ecology"] },
          { parent: "Indian Society", topics: ["Social Structure & Issues", "Women & Empowerment", "Population & Urbanization", "Poverty & Development"] },
        ],
      },
      {
        gsPaper: "GS Paper II",
        topics: [
          { parent: "Polity & Governance", topics: ["Indian Constitution", "Fundamental Rights & Duties", "Government Structure - Union & State", "Judiciary & Judicial Review", "Local Self Government", "Government Policies & Schemes"] },
          { parent: "Economy", topics: ["Indian Economy - Growth Indicators", "Agriculture & Rural Development", "Industrial Policy", "Banking & Financial System", "International Trade"] },
          { parent: "Security", topics: ["Internal Security Challenges", "Cyber Security", "Border Management", "Role of Armed Forces"] },
        ],
      },
      {
        gsPaper: "GS Paper III",
        topics: [
          { parent: "Science & Technology", topics: ["Recent S&T Developments", "Space Technology & ISRO", "IT & Communication", "Biotechnology", "Environmental Science"] },
          { parent: "Ethics", topics: ["Ethics & Human Values", "Emotional Intelligence", "Public Service Ethics", "Integrity in Governance", "Case Studies"] },
        ],
      },
      {
        gsPaper: "GS Paper IV",
        topics: [
          { parent: "Ethics & Psychology", topics: ["Ethics - Theoretical Framework", "Applied Ethics in Administration", "Emotional Intelligence & Leadership", "Public Service Motivation", "Ethical Dilemmas - Case Studies", "Psychology in Administration"] },
        ],
      },
      {
        gsPaper: "MP Special",
        topics: [
          { parent: "MP History & Culture", topics: ["Ancient MP - Bhimbetka, Sanchi, Ujjain", "Medieval MP - Malwa Sultanate, Bundela Dynasty", "MP in Freedom Struggle", "Post-Independence MP - Formation & Growth", "Cultural Heritage - Tribes, Art, Festivals", "Languages & Literature", "Archaeological & Heritage Sites"] },
          { parent: "MP Geography & Economy", topics: ["Physical Geography - Plateau, Rivers, Forests", "Narmada & Tapti River Systems", "Climate & Vegetation", "Mineral Resources & Mining", "Agriculture & Irrigation", "Industrial Development", "Tourism - Khajuraho, Sanchi, Pachmarhi", "Tribal Areas & Development"] },
          { parent: "MP Governance", topics: ["Administrative Structure of MP", "Panchayati Raj & Local Governance", "MP Government Welfare Schemes", "State Policies & Programs", "Current Issues in MP Development"] },
        ],
      },
    ],
  },
  {
    examType: "RPSC",
    papers: [
      {
        gsPaper: "Paper I",
        topics: [
          { parent: "History", topics: ["Ancient India - Pre-Historic to Gupta Period", "Medieval India - Sultanate & Mughal Period", "Modern India - Colonial Rule & National Movement", "World History - Major Events & Revolutions"] },
          { parent: "Economics", topics: ["Indian Economy - Planning & Growth", "Agriculture & Rural Development", "Industrial Development", "Banking & Finance", "International Trade & Economy"] },
          { parent: "Sociology", topics: ["Indian Society - Structure & Issues", "Social Movements & Reforms", "Caste, Class & Gender", "Education & Health Issues", "Globalization & Social Change"] },
        ],
      },
      {
        gsPaper: "Paper II",
        topics: [
          { parent: "Science & Technology", topics: ["General Science - Physics, Chemistry, Biology", "Recent S&T Developments", "Space & Defense Technology", "IT & Communication", "Biotechnology & Genetic Engineering"] },
          { parent: "Ethics & Reasoning", topics: ["Ethics & Human Values", "Logic & Analytical Reasoning", "Decision Making & Problem Solving", "Integrity & Probity", "Public Service Ethics"] },
        ],
      },
      {
        gsPaper: "Paper III",
        topics: [
          { parent: "Polity & Administration", topics: ["Indian Constitution - Features", "Fundamental Rights & Duties", "Union & State Government", "Judiciary", "Local Self Government", "Public Administration Theories"] },
          { parent: "Current Affairs", topics: ["National Current Affairs", "International Current Affairs", "Sports & Awards", "Government Schemes & Policies", "Important Summits & Agreements"] },
        ],
      },
      {
        gsPaper: "Rajasthan Special",
        topics: [
          { parent: "Rajasthan History", topics: ["Pre-Historic Rajasthan - Kalibangan, Ahar", "Rajput Dynasties - Chauhans, Rathores, Sisodias", "Medieval Rajasthan - Battles & Alliances", "Rajasthan in Freedom Struggle - 1857 & After", "Post-Independence - Princely States Integration", "Major Rulers & Their Contributions"] },
          { parent: "Rajasthan Art & Culture", topics: ["Rajasthani Painting Schools - Mewar, Marwar, Jaipur", "Architecture - Forts, Palaces, Havelis", "Folk Music, Dance & Theatre", "Literature & Languages", "Handicrafts - Pottery, Textiles, Jewelry", "Festivals & Traditions", "Religious Movements & Saints"] },
          { parent: "Rajasthan Geography & Economy", topics: ["Physical Geography - Thar Desert, Aravallis", "Climate & Vegetation", "Rivers & Lakes", "Mineral Resources & Mining", "Agriculture & Animal Husbandry", "Industrial Development & SEZs", "Tourism Development", "Water Resource Management", "Energy Resources - Solar, Wind"] },
          { parent: "Rajasthan Governance", topics: ["Administrative Structure", "Panchayati Raj System", "State Government Policies", "Welfare Schemes & Programs", "Current Developmental Issues"] },
        ],
      },
    ],
  },
  {
    examType: "OPSC",
    papers: [
      {
        gsPaper: "GS Paper I",
        topics: [
          { parent: "Indian History & Culture", topics: ["Ancient India - From Prehistory to Guptas", "Medieval India - Delhi Sultanate to Mughals", "Modern India - British Period & Freedom Struggle", "Art, Architecture & Literature", "Cultural Heritage of India"] },
          { parent: "Geography", topics: ["Physical Geography of India", "Indian Climate, Soil & Vegetation", "Economic Geography - Resources & Industries", "World Geography", "Environmental Issues & Ecology"] },
          { parent: "Indian Society", topics: ["Social Issues & Reforms", "Women & Gender Issues", "Population & Urbanization", "Poverty & Inequality", "Social Empowerment"] },
        ],
      },
      {
        gsPaper: "GS Paper II",
        topics: [
          { parent: "Polity & Governance", topics: ["Indian Constitution", "Fundamental Rights & DPSP", "Union & State Government", "Judiciary", "Local Self Government", "Government Policies"] },
          { parent: "International Relations", topics: ["India's Foreign Policy", "Bilateral Relations", "International Organizations", "Regional Groupings"] },
          { parent: "Social Justice", topics: ["Welfare Schemes", "Education & Health", "Marginalized Sections", "Labour Issues"] },
        ],
      },
      {
        gsPaper: "GS Paper III",
        topics: [
          { parent: "Economy", topics: ["Indian Economy - Growth & Development", "Agriculture & Food Security", "Industrial Policy", "Infrastructure Development", "Banking & Finance", "International Trade"] },
          { parent: "Science & Technology", topics: ["S&T Developments", "Space & Nuclear Technology", "IT & Biotechnology", "Environmental Science"] },
          { parent: "Security & Disaster Management", topics: ["Internal Security", "Cyber Security", "Disaster Management", "Border Management"] },
        ],
      },
      {
        gsPaper: "GS Paper IV",
        topics: [
          { parent: "Ethics", topics: ["Ethics & Human Values", "Emotional Intelligence", "Public Service Ethics", "Integrity & Probity", "Ethical Dilemmas"] },
        ],
      },
      {
        gsPaper: "Odisha Special",
        topics: [
          { parent: "Odisha History & Culture", topics: ["Ancient Odisha - Kalinga Empire, Ashoka's Invasion", "Medieval Odisha - Ganga Dynasty, Gajapati Kings", "Colonial Period & Odisha in National Movement", "Post-Independence - Formation of Odisha State", "Konark, Jagannath Temple & Architecture", "Odissi Dance, Pattachitra Art", "Languages & Literature - Odia Literature", "Tribal Culture & Festivals"] },
          { parent: "Odisha Geography & Economy", topics: ["Physical Geography - Eastern Ghats, Coastal Plains", "Rivers - Mahanadi, Brahmani, Baitarani", "Climate & Natural Vegetation", "Mineral Resources - Iron, Coal, Bauxite", "Agriculture & Irrigation", "Industrial Development - Rourkela, Paradeep", "Tourism & Heritage Sites", "Fisheries & Marine Resources"] },
          { parent: "Odisha Governance", topics: ["Administrative Structure", "Tribal Welfare & PESA Act", "State Government Schemes", "Current Development Issues"] },
        ],
      },
    ],
  },
  {
    examType: "HPSC",
    papers: [
      {
        gsPaper: "GS Paper I",
        topics: [
          { parent: "History & Culture", topics: ["Ancient India", "Medieval India", "Modern India & Freedom Struggle", "Art, Architecture & Literature", "Cultural Heritage"] },
          { parent: "Geography", topics: ["Physical Geography", "Indian Geography", "Economic Geography", "World Geography", "Environmental Issues"] },
          { parent: "Indian Society", topics: ["Social Structure", "Women's Issues", "Population & Urbanization", "Social Empowerment"] },
        ],
      },
      {
        gsPaper: "GS Paper II",
        topics: [
          { parent: "Polity", topics: ["Indian Constitution", "Government Structure", "Judiciary", "Local Governance", "Policies & Schemes"] },
          { parent: "International Relations", topics: ["India's Foreign Policy", "International Organizations", "Regional Cooperation"] },
          { parent: "Economy", topics: ["Indian Economy", "Agriculture & Industry", "Banking & Finance", "International Trade"] },
        ],
      },
      {
        gsPaper: "GS Paper III",
        topics: [
          { parent: "Science & Technology", topics: ["Recent Developments in S&T", "Space & Defense", "IT & Communication", "Biotechnology", "Environment & Ecology"] },
          { parent: "Security", topics: ["Internal Security", "Cyber Security", "Border Management", "Disaster Management"] },
        ],
      },
      {
        gsPaper: "GS Paper IV",
        topics: [
          { parent: "Ethics", topics: ["Ethics & Values", "Emotional Intelligence", "Public Service Ethics", "Integrity", "Case Studies"] },
        ],
      },
      {
        gsPaper: "Haryana Special",
        topics: [
          { parent: "Haryana History & Culture", topics: ["Ancient Haryana - Indraprastha, Kurukshetra", "Medieval Period - Rajputs, Mughals", "Haryana in Freedom Struggle", "Post-Independence - State Formation (1966)", "Folk Culture - Ragini, Saang, Phag", "Art & Handicrafts", "Languages & Literature", "Festivals & Traditions"] },
          { parent: "Haryana Geography & Economy", topics: ["Physical Geography - Aravalli Hills, Plains", "Climate & Vegetation", "Rivers & Water Resources", "Agriculture - Green Revolution Impact", "Industrial Development - Gurgaon, Faridabad", "IT & Service Sector", "State Economy - GDP & Sectors", "Transport & Infrastructure"] },
          { parent: "Haryana Governance", topics: ["Administrative Structure", "Panchayati Raj in Haryana", "State Government Policies", "Welfare Schemes", "Current Issues"] },
        ],
      },
    ],
  },
  {
    examType: "UKPSC",
    papers: [
      {
        gsPaper: "GS Paper I",
        topics: [
          { parent: "History & Culture", topics: ["Ancient India", "Medieval India", "Modern India & National Movement", "World History", "Art & Architecture"] },
          { parent: "Geography", topics: ["Physical Geography", "Indian Geography", "World Geography", "Environmental Issues"] },
          { parent: "Indian Society", topics: ["Social Issues", "Women & Empowerment", "Population", "Poverty & Development"] },
        ],
      },
      {
        gsPaper: "GS Paper II",
        topics: [
          { parent: "Polity & Governance", topics: ["Indian Constitution", "Government Structure", "Judiciary", "Local Governance", "Public Policy"] },
          { parent: "Economy", topics: ["Indian Economy", "Agriculture", "Industry", "Banking & Finance", "Trade & Investment"] },
          { parent: "Science & Technology", topics: ["S&T Developments", "Space Technology", "IT & Communication", "Biotechnology"] },
        ],
      },
      {
        gsPaper: "GS Paper III",
        topics: [
          { parent: "Security & Environment", topics: ["Internal Security", "Cyber Security", "Environmental Conservation", "Climate Change", "Disaster Management"] },
          { parent: "Ethics", topics: ["Ethics & Values", "Public Service Ethics", "Emotional Intelligence", "Case Studies"] },
        ],
      },
      {
        gsPaper: "GS Paper IV",
        topics: [
          { parent: "Ethics & Aptitude", topics: ["Ethics - Theory & Practice", "Aptitude for Civil Services", "Integrity & Probity", "Emotional Intelligence", "Ethical Dilemmas"] },
        ],
      },
      {
        gsPaper: "Uttarakhand Special I",
        topics: [
          { parent: "UK History & Culture", topics: ["Ancient Uttarakhand - Kedarkhand, Manaskhand", "Chand & Katyuri Dynasties", "British Period & Kumaon Division", "Freedom Struggle in Uttarakhand", "Chipko Movement & Environmental Activism", "Uttarakhand Statehood Movement", "Cultural Heritage - Pahari Art, Music", "Languages & Literature - Garhwali, Kumaoni", "Festivals & Pilgrimages - Char Dham"] },
          { parent: "UK Polity", topics: ["State Formation & Governance", "Administrative Structure", "Panchayati Raj in UK", "PESA & Tribal Areas"] },
        ],
      },
      {
        gsPaper: "Uttarakhand Special II",
        topics: [
          { parent: "UK Geography & Economy", topics: ["Himalayan Geography - Great, Lesser, Shiwaliks", "River Systems - Ganga, Yamuna Origins", "Climate & Glaciers", "Forests & Biodiversity", "National Parks - Corbett, Nanda Devi, Valley of Flowers", "Agriculture & Horticulture", "Tourism Development & Eco-Tourism", "Hydropower & Energy", "Migration & Demographic Issues", "State Economy & Development Challenges", "Current Affairs of Uttarakhand"] },
        ],
      },
    ],
  },
  {
    examType: "HPPSC",
    papers: [
      {
        gsPaper: "GS Paper I",
        topics: [
          { parent: "History & Culture", topics: ["Ancient India", "Medieval India", "Modern India & Freedom Struggle", "Indian Art, Architecture & Heritage"] },
          { parent: "Geography", topics: ["Physical Geography of India", "Indian Climate & Soil", "Economic Geography", "World Geography"] },
          { parent: "Indian Society", topics: ["Social Issues & Diversity", "Women & Empowerment", "Population & Urbanization"] },
        ],
      },
      {
        gsPaper: "GS Paper II",
        topics: [
          { parent: "Polity & Governance", topics: ["Indian Constitution", "Union & State Government", "Judiciary", "Local Self Government", "Government Policies"] },
          { parent: "Economy", topics: ["Indian Economy", "Agriculture", "Industry & Infrastructure", "Banking & Finance"] },
        ],
      },
      {
        gsPaper: "GS Paper III",
        topics: [
          { parent: "Science & Technology", topics: ["S&T Developments", "Space Technology", "IT & Communication", "Environmental Science"] },
          { parent: "Social Development", topics: ["Education Policies", "Health Sector Reforms", "Women & Child Development", "Social Welfare Schemes"] },
        ],
      },
      {
        gsPaper: "HP Special",
        topics: [
          { parent: "HP History & Culture", topics: ["Ancient HP - Trigarta, Kuluta, Audumbara", "Medieval HP - Rajput Hill States", "British Period - Hill States under Paramountcy", "Post-Independence - Integration & State Formation", "Cultural Heritage - Pahari Painting", "Folk Art, Music & Dance", "Languages - Pahari Dialects", "Religious Centers - Temples, Monasteries", "Festivals & Fairs"] },
          { parent: "HP Geography & Economy", topics: ["Himalayan Geography - Great, Middle, Outer", "River Systems - Sutlej, Beas, Ravi, Chenab", "Climate & Vegetation Zones", "Forests & Wildlife - Great Himalayan National Park", "Agriculture & Horticulture - Apple Economy", "Hydropower Development", "Tourism - Shimla, Manali, Dharamshala", "Tribal Areas - Lahaul-Spiti, Kinnaur", "State Economy & Development Indicators"] },
          { parent: "HP Governance", topics: ["Administrative Structure", "Panchayati Raj", "State Government Schemes", "Environmental Policies", "Current Issues in HP"] },
        ],
      },
    ],
  },
  {
    examType: "APSC_Assam",
    papers: [
      {
        gsPaper: "GS Paper I",
        topics: [
          { parent: "History & Culture", topics: ["Ancient India - From Pre-History to Guptas", "Medieval India", "Modern India & Freedom Struggle", "Indian Art, Architecture & Literature"] },
          { parent: "Geography", topics: ["Physical Geography", "Indian Geography", "World Geography", "Environmental Issues"] },
          { parent: "Indian Society", topics: ["Social Structure & Issues", "Diversity & Pluralism", "Women & Gender", "Population"] },
        ],
      },
      {
        gsPaper: "GS Paper II",
        topics: [
          { parent: "Polity & Governance", topics: ["Indian Constitution", "Government Structure", "Judiciary", "Policies & Governance"] },
          { parent: "International Relations", topics: ["Foreign Policy", "India & Neighbors", "International Organizations"] },
          { parent: "Economy", topics: ["Indian Economy", "Agriculture", "Industry", "Banking & Finance"] },
        ],
      },
      {
        gsPaper: "GS Paper III",
        topics: [
          { parent: "Science & Technology", topics: ["S&T Developments", "Space & Nuclear Technology", "IT & Biotechnology"] },
          { parent: "Environment & Security", topics: ["Environment & Ecology", "Climate Change", "Internal Security", "Disaster Management"] },
        ],
      },
      {
        gsPaper: "GS Paper IV",
        topics: [
          { parent: "Ethics", topics: ["Ethics & Values", "Emotional Intelligence", "Public Service Ethics", "Case Studies"] },
        ],
      },
      {
        gsPaper: "Assam Special",
        topics: [
          { parent: "Assam History", topics: ["Ancient Assam - Kamarupa Kingdom, Varman & Pala Dynasties", "Ahom Dynasty - 600 Years Rule", "Koch Dynasty & Medieval Assam", "British Period - Treaty of Yandaboo (1826)", "Assam in Freedom Struggle - Maniram Dewan, Kanaklata Barua", "Post-Independence - Language Movement, AASU Movement", "Assam Accord & Its Implementation"] },
          { parent: "Assam Culture", topics: ["Assamese Literature - Sankaradeva, Madhavadeva", "Sattriya Dance & Music", "Bihu Festival & Folk Culture", "Majuli - River Island Culture", "Tribal Art & Crafts", "Languages & Dialects of NE Region", "Religious Traditions - Neo-Vaishnavism"] },
          { parent: "Assam Geography & Economy", topics: ["Brahmaputra Valley & Barak Valley", "Climate & Monsoon - Floods", "Tea Industry & Plantations", "Oil & Natural Gas - Digboi", "Agriculture - Rice, Jute", "Silk Industry - Muga, Eri, Pat", "One Horned Rhino & Kaziranga", "Biodiversity & National Parks", "Infrastructure & Connectivity", "Current Development Issues"] },
        ],
      },
    ],
  },
  {
    examType: "MeghalayaPSC",
    papers: [
      {
        gsPaper: "GS Paper I",
        topics: [
          { parent: "History & Culture", topics: ["Ancient & Medieval India", "Modern India & National Movement", "World History", "Indian Art & Architecture"] },
          { parent: "Geography", topics: ["Physical Geography", "Indian & World Geography", "Environmental Issues"] },
        ],
      },
      {
        gsPaper: "GS Paper II",
        topics: [
          { parent: "Polity & Governance", topics: ["Indian Constitution", "Government Structure", "Judiciary", "Public Policy"] },
          { parent: "International Relations", topics: ["India's Foreign Policy", "International Organizations"] },
        ],
      },
      {
        gsPaper: "GS Paper III",
        topics: [
          { parent: "Economy & Science", topics: ["Indian Economy", "Agriculture & Industry", "Science & Technology", "Environment & Ecology"] },
          { parent: "Security", topics: ["Internal Security", "Disaster Management", "Cyber Security"] },
        ],
      },
      {
        gsPaper: "GS Paper IV",
        topics: [
          { parent: "Ethics", topics: ["Ethics & Values", "Public Service Ethics", "Emotional Intelligence", "Case Studies"] },
        ],
      },
      {
        gsPaper: "Meghalaya Special",
        topics: [
          { parent: "Meghalaya History & Culture", topics: ["History of Khasi, Garo & Jaintia Hills", "British Administration - Khasi Uprising", "Freedom Movement in Meghalaya", "State Formation (1972)", "Khasi, Garo & Jaintia Tribal Culture", "Languages - Khasi, Garo", "Art, Music & Dance", "Religious Practices & Traditions", "Festivals - Wangala, Nongkrem, Behdienkhlam"] },
          { parent: "Meghalaya Geography & Economy", topics: ["Physical Geography - Shillong Plateau, Garo Hills", "Climate - Cherrapunji, Mawsynram (Wettest Place)", "Rivers & Water Resources", "Forests & Biodiversity", "Mineral Resources - Coal, Limestone, Sillimanite", "Agriculture - Jhum Cultivation", "Tourism Development", "State Economy & Challenges", "Infrastructure & Connectivity"] },
          { parent: "Meghalaya Governance", topics: ["Sixth Schedule & Autonomous Councils", "Administrative Structure", "Traditional Governance - Dorbar Shnong", "State Development Policies", "Current Issues & Development"] },
        ],
      },
    ],
  },
  {
    examType: "SikkimPSC",
    papers: [
      {
        gsPaper: "General Studies",
        topics: [
          { parent: "Indian History & Culture", topics: ["Ancient, Medieval & Modern India", "National Movement", "Art & Architecture", "Cultural Heritage"] },
          { parent: "Geography", topics: ["Physical Geography", "Indian Geography", "Environmental Issues"] },
          { parent: "Polity & Economy", topics: ["Indian Constitution", "Governance", "Indian Economy", "Science & Technology"] },
        ],
      },
      {
        gsPaper: "Current Affairs & Analytical",
        topics: [
          { parent: "Current Affairs", topics: ["National Current Affairs", "International Current Affairs", "Sports & Awards", "Government Schemes", "Important Agreements & Summits"] },
          { parent: "Analytical Ability", topics: ["Logical Reasoning", "Data Interpretation", "Decision Making", "Problem Solving"] },
        ],
      },
      {
        gsPaper: "Sikkim Special",
        topics: [
          { parent: "Sikkim History & Culture", topics: ["Ancient Sikkim - Lepcha Origin Myths", "Namgyal Dynasty - Chogyal Rule", "British Period & Treaty of Titalia (1817)", "Merger with India (1975)", "Cultural Heritage - Buddhist Monasteries", "Ethnic Communities - Lepcha, Bhutia, Nepali", "Languages & Literature", "Folk Art, Music & Dance", "Festivals - Losar, Saga Dawa, Pang Lhabsol"] },
          { parent: "Sikkim Geography & Economy", topics: ["Himalayan Geography - Kanchenjunga", "Climate & Vegetation Zones", "Rivers - Teesta, Rangeet", "National Parks & Biodiversity", "Organic Farming - India's First Organic State", "Tourism Development - Eco Tourism", "Cardamom & Tea Cultivation", "Hydropower & Energy", "State Economy & Development", "Current Issues in Sikkim"] },
          { parent: "Sikkim Governance", topics: ["Administrative Structure", "Panchayati Raj", "Tribal Administration", "State Government Initiatives", "Environmental Policies"] },
        ],
      },
    ],
  },
  {
    examType: "TripuraPSC",
    papers: [
      {
        gsPaper: "GS Paper I",
        topics: [
          { parent: "General Knowledge & Current Affairs", topics: ["National & International Current Events", "Indian History & Culture", "Geography of India & World", "Science & Technology", "Sports & Awards"] },
        ],
      },
      {
        gsPaper: "Constitution & Polity",
        topics: [
          { parent: "Indian Constitution & Political System", topics: ["Constitutional Framework", "Fundamental Rights & Duties", "Directive Principles", "Union & State Government", "Judiciary", "Local Self Government", "Electoral System", "Constitutional Amendments", "Political Parties & Coalitions"] },
        ],
      },
      {
        gsPaper: "Economy & Planning",
        topics: [
          { parent: "Economic Development", topics: ["Indian Economy - Overview", "Five Year Plans & NITI Aayog", "Agriculture & Food Security", "Industrial Development", "Banking & Financial System", "Fiscal & Monetary Policy", "International Trade & WTO", "Sustainable Development"] },
        ],
      },
      {
        gsPaper: "Tripura Special",
        topics: [
          { parent: "Tripura History", topics: ["Ancient Tripura - Manikya Dynasty", "Medieval Period - 19 Tribes of Tripura", "British Period - Relations with Hill Tippera", "Merger with India (1949)", "Post-Independence - Political Development", "Tribal Movements & Land Issues", "Communist Movement in Tripura"] },
          { parent: "Tripura Geography & Economy", topics: ["Physical Geography - Hills, Plains", "Climate & Natural Vegetation", "Rivers - Gomati, Manu, Khowai", "Agriculture - Rubber, Tea, Rice", "Bamboo & Handloom Industry", "Forests & Biodiversity", "State Economy & Development", "Infrastructure & Connectivity"] },
          { parent: "Tripura Culture & Governance", topics: ["Tribal Culture - 19 Tribes", "Languages - Bengali, Kokborok", "Art, Dance & Music", "Festivals - Kharchi, Garia", "Administrative Structure", "Autonomous District Councils", "State Government Schemes", "Current Issues in Tripura"] },
        ],
      },
    ],
  },
  {
    examType: "ArunachalPSC",
    papers: [
      {
        gsPaper: "GS Paper I",
        topics: [
          { parent: "History & Culture", topics: ["Ancient & Medieval India", "Modern India & National Movement", "World History", "Indian Art & Architecture"] },
          { parent: "Geography", topics: ["Physical Geography", "Indian & World Geography", "Environmental Conservation"] },
        ],
      },
      {
        gsPaper: "GS Paper II",
        topics: [
          { parent: "Polity & Governance", topics: ["Indian Constitution", "Government Structure", "Judiciary", "Local Governance", "Policies & Schemes"] },
          { parent: "International Relations", topics: ["India's Foreign Policy", "India & Neighbors", "International Organizations"] },
        ],
      },
      {
        gsPaper: "GS Paper III",
        topics: [
          { parent: "Economy & Development", topics: ["Indian Economy", "Agriculture & Industry", "Infrastructure Development", "Banking & Finance"] },
          { parent: "Science & Technology", topics: ["S&T Developments", "Space Technology", "IT & Biotechnology", "Environment & Ecology"] },
        ],
      },
      {
        gsPaper: "GS Paper IV",
        topics: [
          { parent: "Ethics", topics: ["Ethics & Values", "Public Service Ethics", "Emotional Intelligence", "Case Studies"] },
        ],
      },
      {
        gsPaper: "Arunachal & NE Special",
        topics: [
          { parent: "Arunachal History", topics: ["Ancient History - Tribal Origins & Migration", "Abor, Mishmi, Monpa & Other Tribes", "NEFA - North East Frontier Agency Period", "1962 Indo-China War & Its Impact", "Statehood (1987) & Political Development", "Border Issues - McMahon Line"] },
          { parent: "Arunachal Culture", topics: ["26 Major Tribes & Sub-Tribes", "Cultural Heritage - Festivals, Rituals", "Languages & Dialects", "Art & Crafts - Weaving, Woodcarving", "Religious Practices - Donyi-Polo, Buddhism", "Festivals - Solung, Mopin, Losar, Si-Donyi", "Music, Dance & Folk Traditions"] },
          { parent: "Arunachal Geography & Economy", topics: ["Eastern Himalayan Geography", "Climate & Biodiversity Hotspot", "Rivers - Siang, Subansiri, Lohit, Kameng", "Forests - Tropical to Alpine", "National Parks - Namdapha, Mouling", "Agriculture - Shifting Cultivation, Terrace Farming", "Hydropower Potential", "Tourism & Eco-Tourism", "Infrastructure & Connectivity Challenges", "State Economy & Development"] },
          { parent: "NE Region Overview", topics: ["North East India - Administrative Overview", "Look East/Act East Policy & NE", "NE Council & DONER Ministry", "Security Issues in NE Region", "Tribal Autonomy & Sixth Schedule", "Current Development Issues"] },
        ],
      },
    ],
  },
];

async function seedSyllabusIfNeeded() {
  const existing = await db.select({ count: sql<number>`count(*)::int` }).from(syllabusTopics);
  if (existing[0]?.count > 0) return;

  for (const exam of ALL_EXAM_SYLLABI) {
    let orderIdx = 0;
    for (const paper of exam.papers) {
      for (const section of paper.topics) {
        await db.insert(syllabusTopics).values({
          examType: exam.examType,
          gsPaper: paper.gsPaper,
          parentTopic: null,
          topic: section.parent,
          orderIndex: orderIdx++,
        });
        for (const topic of section.topics) {
          await db.insert(syllabusTopics).values({
            examType: exam.examType,
            gsPaper: paper.gsPaper,
            parentTopic: section.parent,
            topic,
            orderIndex: orderIdx++,
          });
        }
      }
    }
  }
}

export function registerStudyPlannerRoutes(app: Express): void {
  seedSyllabusIfNeeded().catch(console.error);

  app.get("/api/study-planner/timetable", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const slots = await db.select().from(timetableSlots)
        .where(eq(timetableSlots.userId, userId))
        .orderBy(timetableSlots.dayOfWeek, timetableSlots.startTime);
      res.json(slots);
    } catch (error) {
      console.error("Error fetching timetable:", error);
      res.status(500).json({ error: "Failed to fetch timetable" });
    }
  });

  app.post("/api/study-planner/timetable", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const schema = z.object({
        dayOfWeek: z.number().min(0).max(6),
        startTime: z.string(),
        endTime: z.string(),
        gsPaper: z.string(),
        subject: z.string(),
        notes: z.string().optional(),
      });
      const data = schema.parse(req.body);
      const [slot] = await db.insert(timetableSlots).values({ ...data, userId }).returning();
      res.status(201).json(slot);
    } catch (error) {
      console.error("Error creating timetable slot:", error);
      res.status(400).json({ error: "Failed to create timetable slot" });
    }
  });

  app.delete("/api/study-planner/timetable/:id", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const id = parseInt(req.params.id);
      await db.delete(timetableSlots).where(and(eq(timetableSlots.id, id), eq(timetableSlots.userId, userId)));
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting timetable slot:", error);
      res.status(500).json({ error: "Failed to delete timetable slot" });
    }
  });

  app.get("/api/study-planner/syllabus", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const examType = (req.query.examType as string) || "UPSC";
      const topics = await db.select().from(syllabusTopics)
        .where(eq(syllabusTopics.examType, examType))
        .orderBy(syllabusTopics.orderIndex);
      const progress = await db.select().from(userSyllabusProgress).where(eq(userSyllabusProgress.userId, userId));
      const progressMap: Record<number, boolean> = {};
      for (const p of progress) {
        progressMap[p.topicId] = p.completed;
      }
      const result = topics.map((t) => ({ ...t, completed: progressMap[t.id] || false }));
      res.json(result);
    } catch (error) {
      console.error("Error fetching syllabus:", error);
      res.status(500).json({ error: "Failed to fetch syllabus" });
    }
  });

  app.patch("/api/study-planner/syllabus/:topicId", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const topicId = parseInt(req.params.topicId);
      const { completed } = req.body;
      const existing = await db.select().from(userSyllabusProgress)
        .where(and(eq(userSyllabusProgress.userId, userId), eq(userSyllabusProgress.topicId, topicId)));
      if (existing.length > 0) {
        await db.update(userSyllabusProgress)
          .set({ completed, completedAt: completed ? new Date() : null })
          .where(and(eq(userSyllabusProgress.userId, userId), eq(userSyllabusProgress.topicId, topicId)));
      } else {
        await db.insert(userSyllabusProgress).values({
          userId,
          topicId,
          completed,
          completedAt: completed ? new Date() : null,
        });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Error updating syllabus progress:", error);
      res.status(500).json({ error: "Failed to update progress" });
    }
  });

  app.get("/api/study-planner/daily-goals", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const dateStr = req.query.date as string || new Date().toISOString().split("T")[0];
      const goals = await db.select().from(dailyStudyGoals)
        .where(and(eq(dailyStudyGoals.userId, userId), eq(dailyStudyGoals.goalDate, dateStr)))
        .orderBy(dailyStudyGoals.createdAt);
      res.json(goals);
    } catch (error) {
      console.error("Error fetching daily goals:", error);
      res.status(500).json({ error: "Failed to fetch daily goals" });
    }
  });

  app.post("/api/study-planner/daily-goals", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const schema = z.object({
        title: z.string().min(1),
        goalDate: z.string(),
      });
      const data = schema.parse(req.body);
      const [goal] = await db.insert(dailyStudyGoals).values({ ...data, userId }).returning();
      res.status(201).json(goal);
    } catch (error) {
      console.error("Error creating daily goal:", error);
      res.status(400).json({ error: "Failed to create daily goal" });
    }
  });

  app.patch("/api/study-planner/daily-goals/:id", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const id = parseInt(req.params.id);
      const { completed } = req.body;
      await db.update(dailyStudyGoals)
        .set({ completed })
        .where(and(eq(dailyStudyGoals.id, id), eq(dailyStudyGoals.userId, userId)));
      res.json({ success: true });
    } catch (error) {
      console.error("Error updating daily goal:", error);
      res.status(500).json({ error: "Failed to update daily goal" });
    }
  });

  app.delete("/api/study-planner/daily-goals/:id", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const id = parseInt(req.params.id);
      await db.delete(dailyStudyGoals)
        .where(and(eq(dailyStudyGoals.id, id), eq(dailyStudyGoals.userId, userId)));
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting daily goal:", error);
      res.status(500).json({ error: "Failed to delete daily goal" });
    }
  });

  app.get("/api/study-planner/weekly-goals", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const today = new Date();
      const dayOfWeek = today.getDay();
      const monday = new Date(today);
      monday.setDate(today.getDate() - ((dayOfWeek === 0 ? 7 : dayOfWeek) - 1));

      const weekDates: string[] = [];
      for (let i = 0; i < 7; i++) {
        const d = new Date(monday);
        d.setDate(monday.getDate() + i);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, "0");
        const dd = String(d.getDate()).padStart(2, "0");
        weekDates.push(`${yyyy}-${mm}-${dd}`);
      }

      const result = [];
      for (const dateStr of weekDates) {
        const goals = await db.select().from(dailyStudyGoals)
          .where(and(eq(dailyStudyGoals.userId, userId), eq(dailyStudyGoals.goalDate, dateStr)));
        const total = goals.length;
        const completed = goals.filter(g => g.completed).length;
        result.push({ date: dateStr, total, completed });
      }
      res.json(result);
    } catch (error) {
      console.error("Error fetching weekly goals:", error);
      res.status(500).json({ error: "Failed to fetch weekly goals" });
    }
  });

  app.get("/api/study-planner/dashboard", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const examType = (req.query.examType as string) || "UPSC";

      const topics = await db.select().from(syllabusTopics)
        .where(eq(syllabusTopics.examType, examType))
        .orderBy(syllabusTopics.orderIndex);
      const progress = await db.select().from(userSyllabusProgress).where(eq(userSyllabusProgress.userId, userId));
      const progressMap: Record<number, boolean> = {};
      for (const p of progress) {
        progressMap[p.topicId] = p.completed;
      }

      const paperSet = new Set(topics.map(t => t.gsPaper));
      const papers = Array.from(paperSet);
      const paperProgress = papers.map((paper) => {
        const paperTopics = topics.filter((t) => t.gsPaper === paper && t.parentTopic !== null);
        const completed = paperTopics.filter((t) => progressMap[t.id]).length;
        return {
          paper,
          total: paperTopics.length,
          completed,
          percentage: paperTopics.length > 0 ? Math.round((completed / paperTopics.length) * 100) : 0,
        };
      });

      const totalTopics = topics.filter((t) => t.parentTopic !== null).length;
      const totalCompleted = topics.filter((t) => t.parentTopic !== null && progressMap[t.id]).length;
      const overallProgress = totalTopics > 0 ? Math.round((totalCompleted / totalTopics) * 100) : 0;

      const attempts = await db.select().from(quizAttempts)
        .where(eq(quizAttempts.userId, userId));

      const categoryStats: Record<string, { correct: number; total: number }> = {};
      for (const attempt of attempts) {
        if (!attempt.completedAt) continue;
        const questions = await db.select().from(quizQuestions)
          .where(eq(quizQuestions.attemptId, attempt.id));
        const cat = attempt.gsCategory;
        if (!categoryStats[cat]) {
          categoryStats[cat] = { correct: 0, total: 0 };
        }
        for (const q of questions) {
          categoryStats[cat].total++;
          if (q.isCorrect) categoryStats[cat].correct++;
        }
      }

      const weakAreas = Object.entries(categoryStats)
        .map(([category, stats]) => ({
          category,
          accuracy: stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0,
          totalQuestions: stats.total,
          correct: stats.correct,
        }))
        .sort((a, b) => a.accuracy - b.accuracy)
        .slice(0, 5);

      const recommendedTopics = topics
        .filter((t) => t.parentTopic !== null && !progressMap[t.id])
        .slice(0, 6)
        .map((t) => ({ topic: t.topic, gsPaper: t.gsPaper, parentTopic: t.parentTopic }));

      const today = new Date().toISOString().split("T")[0];
      const todayGoals = await db.select().from(dailyStudyGoals)
        .where(and(eq(dailyStudyGoals.userId, userId), eq(dailyStudyGoals.goalDate, today)));
      const goalsCompleted = todayGoals.filter((g) => g.completed).length;

      res.json({
        overallProgress,
        paperProgress,
        weakAreas,
        recommendedTopics,
        todayGoals: { total: todayGoals.length, completed: goalsCompleted },
      });
    } catch (error) {
      console.error("Error fetching dashboard:", error);
      res.status(500).json({ error: "Failed to fetch dashboard" });
    }
  });

  app.get("/api/study-planner/exam-types", isAuthenticated, async (_req: any, res: Response) => {
    try {
      const result = await db.selectDistinct({ examType: syllabusTopics.examType }).from(syllabusTopics);
      res.json(result.map(r => r.examType));
    } catch (error) {
      console.error("Error fetching exam types:", error);
      res.status(500).json({ error: "Failed to fetch exam types" });
    }
  });

  const ai = new GoogleGenAI({
    apiKey: process.env.AI_INTEGRATIONS_GEMINI_API_KEY,
    httpOptions: {
      apiVersion: "",
      baseUrl: process.env.AI_INTEGRATIONS_GEMINI_BASE_URL,
    },
  });

  const EXAM_LABELS: Record<string, string> = {
    UPSC: "UPSC CSE",
    JPSC: "JPSC (Jharkhand)",
    BPSC: "BPSC (Bihar)",
    JKPSC: "JKPSC (J&K)",
    UPPSC: "UPPSC (Uttar Pradesh)",
    MPPSC: "MPPSC (Madhya Pradesh)",
    RPSC: "RPSC (Rajasthan)",
    OPSC: "OPSC (Odisha)",
    HPSC: "HPSC (Haryana)",
    UKPSC: "UKPSC (Uttarakhand)",
    HPPSC: "HPPSC (Himachal Pradesh)",
    APSC_Assam: "APSC (Assam)",
    MeghalayaPSC: "Meghalaya PSC",
    SikkimPSC: "Sikkim PSC",
    TripuraPSC: "Tripura PSC",
    ArunachalPSC: "Arunachal PSC",
  };

  app.post("/api/study-planner/ai-generate-timetable", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const { targetExams } = req.body as { targetExams: string[] };
      const exams = targetExams && targetExams.length > 0 ? targetExams : ["UPSC"];
      const examNames = exams.map(e => EXAM_LABELS[e] || e).join(", ");

      const topics = await db.select().from(syllabusTopics)
        .where(sql`${syllabusTopics.examType} IN ${exams}`)
        .orderBy(syllabusTopics.orderIndex);

      const progress = await db.select().from(userSyllabusProgress).where(eq(userSyllabusProgress.userId, userId));
      const completedIds = new Set(progress.filter(p => p.completed).map(p => p.topicId));

      const pendingByPaper: Record<string, string[]> = {};
      for (const t of topics) {
        if (t.parentTopic && !completedIds.has(t.id)) {
          const key = `${t.gsPaper}`;
          if (!pendingByPaper[key]) pendingByPaper[key] = [];
          if (pendingByPaper[key].length < 5) pendingByPaper[key].push(t.topic);
        }
      }

      const pendingSummary = Object.entries(pendingByPaper)
        .map(([paper, topics]) => `${paper}: ${topics.join(", ")}`)
        .join("\n");

      const plannerLangCode = getUserLanguage(req);
      const plannerLangInst = getLanguageInstruction(plannerLangCode);
      const prompt = `You are a UPSC/State PSC exam preparation expert. Create a practical weekly study timetable for a student preparing for ${examNames}.

The student has these pending topics to cover:
${pendingSummary || "General revision across all papers"}

Generate a realistic weekly timetable (Monday to Saturday, Sunday is rest/revision) with 4-6 study slots per day. Each slot should be 1-2 hours. Include morning, afternoon, and evening sessions. Mix different papers/subjects for variety.

IMPORTANT: Respond ONLY with a valid JSON array. No markdown, no explanation, no code blocks.
Each item must have exactly these fields:
- "dayOfWeek": number (1=Monday, 2=Tuesday, 3=Wednesday, 4=Thursday, 5=Friday, 6=Saturday)
- "startTime": string in "HH:MM" 24hr format
- "endTime": string in "HH:MM" 24hr format
- "gsPaper": string (the paper name like "GS Paper I", "GS Paper II", "GS Paper III", "GS Paper IV", "Current Affairs", "Optional Subject", "Essay", or exam-specific paper names)
- "subject": string (specific topic to study)${plannerLangInst ? `\n\nIMPORTANT LANGUAGE: Write the "subject" field values in ${getLanguageName(plannerLangCode)} language. Keep "gsPaper" values in English. Only keep proper nouns and technical terms in English within subject descriptions.` : ""}

Example: [{"dayOfWeek":1,"startTime":"06:00","endTime":"08:00","gsPaper":"GS Paper I","subject":"Ancient Indian History - Indus Valley Civilization"}]

Generate 25-30 slots covering the full week with a balanced schedule.`;

      const result = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [{ role: "user", parts: [{ text: prompt }] }],
      });

      const responseText = result.text || "";
      const jsonMatch = responseText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

      let slots: any[];
      try {
        slots = JSON.parse(jsonMatch);
      } catch {
        console.error("Failed to parse AI timetable response:", responseText.substring(0, 500));
        return res.status(500).json({ error: "AI generated an invalid response. Please try again." });
      }

      if (!Array.isArray(slots) || slots.length === 0) {
        return res.status(500).json({ error: "AI generated no timetable slots. Please try again." });
      }

      await db.delete(timetableSlots).where(eq(timetableSlots.userId, userId));

      const insertData = slots
        .filter(s => s.dayOfWeek >= 0 && s.dayOfWeek <= 6 && s.startTime && s.endTime && s.gsPaper && s.subject)
        .map(s => ({
          userId,
          dayOfWeek: typeof s.dayOfWeek === "number" ? s.dayOfWeek : parseInt(s.dayOfWeek),
          startTime: s.startTime,
          endTime: s.endTime,
          gsPaper: s.gsPaper,
          subject: s.subject,
        }));

      if (insertData.length > 0) {
        await db.insert(timetableSlots).values(insertData);
      }

      const newSlots = await db.select().from(timetableSlots)
        .where(eq(timetableSlots.userId, userId))
        .orderBy(timetableSlots.dayOfWeek);

      res.json(newSlots);
    } catch (error) {
      console.error("Error generating AI timetable:", error);
      res.status(500).json({ error: "Failed to generate timetable. Please try again." });
    }
  });

  app.post("/api/study-planner/ai-generate-goals", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const { targetExams, date } = req.body as { targetExams: string[]; date: string };
      const exams = targetExams && targetExams.length > 0 ? targetExams : ["UPSC"];
      const goalDate = date || new Date().toISOString().split("T")[0];
      const examNames = exams.map(e => EXAM_LABELS[e] || e).join(", ");

      const dayOfWeek = new Date(goalDate).toLocaleDateString("en-US", { weekday: "long" });

      const topics = await db.select().from(syllabusTopics)
        .where(sql`${syllabusTopics.examType} IN ${exams}`)
        .orderBy(syllabusTopics.orderIndex);

      const progress = await db.select().from(userSyllabusProgress).where(eq(userSyllabusProgress.userId, userId));
      const completedIds = new Set(progress.filter(p => p.completed).map(p => p.topicId));

      const pendingTopics = topics
        .filter(t => t.parentTopic && !completedIds.has(t.id))
        .slice(0, 20)
        .map(t => `${t.gsPaper} > ${t.topic}`);

      const timetable = await db.select().from(timetableSlots)
        .where(eq(timetableSlots.userId, userId));

      const todaySlots = timetable
        .filter(s => {
          const d = new Date(goalDate).getDay();
          return s.dayOfWeek === d;
        })
        .map(s => `${s.startTime}-${s.endTime}: ${s.gsPaper} - ${s.subject}`);

      const goalsLangCode = getUserLanguage(req);
      const goalsLangInst = goalsLangCode && goalsLangCode !== "en" ? `\n\nIMPORTANT LANGUAGE: Write ALL goal strings in ${getLanguageName(goalsLangCode)} language. Only keep proper nouns, book titles, and technical terms in English.` : "";
      const prompt = `You are a UPSC/State PSC exam preparation expert. Create practical, actionable daily study goals for a student preparing for ${examNames}.

Today is ${dayOfWeek}, ${goalDate}.

${todaySlots.length > 0 ? `Today's timetable:\n${todaySlots.join("\n")}` : "No timetable slots for today."}

${pendingTopics.length > 0 ? `Pending syllabus topics:\n${pendingTopics.join("\n")}` : "General preparation topics."}

Generate 6-10 specific, actionable study goals for today. Include a mix of:
- Subject study goals (read chapter, make notes, solve PYQs)
- Current affairs reading (newspaper analysis, monthly magazine)
- Answer writing practice
- Revision tasks
- Test/quiz practice

IMPORTANT: Respond ONLY with a valid JSON array of strings. No markdown, no explanation, no code blocks.
Each string should be a concise, specific goal (under 80 characters).${goalsLangInst}

Example: ["Read NCERT Ch.3 - Indian National Movement","Write 2 GS Paper II answers on Polity","Solve 30 MCQs on Indian Economy","Read today's newspaper editorial analysis","Revise Environment & Ecology notes","Practice map marking - India rivers"]`;

      const result = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [{ role: "user", parts: [{ text: prompt }] }],
      });

      const responseText = result.text || "";
      const jsonMatch = responseText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

      let goalTitles: string[];
      try {
        goalTitles = JSON.parse(jsonMatch);
      } catch {
        console.error("Failed to parse AI goals response:", responseText.substring(0, 500));
        return res.status(500).json({ error: "AI generated an invalid response. Please try again." });
      }

      if (!Array.isArray(goalTitles) || goalTitles.length === 0) {
        return res.status(500).json({ error: "AI generated no goals. Please try again." });
      }

      const existingGoals = await db.select().from(dailyStudyGoals)
        .where(and(eq(dailyStudyGoals.userId, userId), eq(dailyStudyGoals.goalDate, goalDate)));
      const existingTitles = new Set(existingGoals.map(g => g.title.toLowerCase()));

      const newGoals = goalTitles
        .filter(t => typeof t === "string" && t.trim().length > 0 && !existingTitles.has(t.trim().toLowerCase()))
        .map(t => ({
          userId,
          goalDate,
          title: t.trim(),
        }));

      if (newGoals.length > 0) {
        await db.insert(dailyStudyGoals).values(newGoals);
      }

      const allGoals = await db.select().from(dailyStudyGoals)
        .where(and(eq(dailyStudyGoals.userId, userId), eq(dailyStudyGoals.goalDate, goalDate)))
        .orderBy(dailyStudyGoals.createdAt);

      res.json(allGoals);
    } catch (error) {
      console.error("Error generating AI goals:", error);
      res.status(500).json({ error: "Failed to generate goals. Please try again." });
    }
  });
}
