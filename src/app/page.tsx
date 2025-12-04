import Hero from '@/components/Hero'
import Categories from '@/components/Categories'
import WorkflowSteps from '@/components/WorkflowSteps'
import HowItWorks from '@/components/HowItWorks'
import Testimonials from '@/components/Testimonials'
import Footer from '@/components/Footer'

export default function Home() {
  return (
    <div className="min-h-screen bg-[#0F1115]">
      <Hero />
      <Categories />
      <WorkflowSteps />
      <HowItWorks />
      <Testimonials />
      <Footer />
    </div>
  )
}
