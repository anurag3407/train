import Hero from "@/components/landing/Hero";
import CapabilitiesScroll from "@/components/landing/CapabilitiesScroll";
import ScienceSection from "@/components/landing/ScienceSection";
import HotspotsTeaser from "@/components/landing/HotspotsTeaser";
import ClosingCTA from "@/components/landing/ClosingCTA";

export default function LandingPage() {
  return (
    <>
      <Hero />
      <CapabilitiesScroll />
      <ScienceSection />
      <HotspotsTeaser />
      <ClosingCTA />
    </>
  );
}
