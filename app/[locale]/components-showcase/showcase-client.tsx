'use client'

import { useState } from 'react'
import { ArrowRight, Plus } from 'lucide-react'
import {
  AccentText,
  Avatar,
  Badge,
  BADGE_TOPICS,
  Button,
  CollectionCard,
  CuratorCard,
  Input,
  Modal,
  Tabs,
  ThemeToggle,
} from '@/components/ui'

/**
 * Interactive showcase surface (client) for the base UI kit. Renders every
 * component with its variants side by side so the rendered output can be
 * compared against the mockups (fidelity rule). Static/mock props only — no
 * data logic. The server page wrapper owns metadata (SEO rule).
 */

function Section({
  title,
  hint,
  children,
}: {
  title: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <section className="flex flex-col gap-md border-t border-border-light pt-lg">
      <div className="flex flex-col gap-xs">
        <h2 className="font-serif text-h2 text-foreground">{title}</h2>
        {hint ? (
          <p className="font-sans text-body-small text-foreground/60">
            {hint}
          </p>
        ) : null}
      </div>
      <div className="flex flex-col gap-lg">{children}</div>
    </section>
  )
}

function Row({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-wrap items-center gap-md">{children}</div>
}

export function ShowcaseClient() {
  const [centerOpen, setCenterOpen] = useState(false)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [underlineTab, setUnderlineTab] = useState('links')
  const [pillTab, setPillTab] = useState('all')

  return (
    <div className="flex flex-col gap-2xl">
      {/* Accent text pattern */}
      <Section
        title="Accent text"
        hint="Serif title with one segment in italic violet (§2.3)."
      >
        <AccentText
          before="The internet worth "
          accent="keeping"
          size="display"
        />
        <AccentText
          before="Explore inspiring "
          accent="universes"
          after="."
          size="h1"
          as="h2"
        />
      </Section>

      {/* Buttons */}
      <Section
        title="Button"
        hint="Pill radius. primary uses the mode-aware fill — try the theme toggle below."
      >
        <Row>
          <Button variant="primary" iconRight={<ArrowRight className="size-4" />}>
            Build your universe
          </Button>
          <Button variant="secondary" iconRight={<ArrowRight className="size-4" />}>
            Explore
          </Button>
          <Button variant="ghost">Ghost</Button>
        </Row>
        <Row>
          <Button variant="primary" size="small">
            Primary small
          </Button>
          <Button variant="secondary" size="small">
            Follow
          </Button>
          <Button variant="secondary" size="small" iconLeft={<Plus className="size-4" />}>
            Add
          </Button>
          <Button variant="primary" disabled>
            Disabled
          </Button>
        </Row>
      </Section>

      {/* Inputs */}
      <Section title="Input" hint="Text (radius sm) and search (pill) + states.">
        <div className="grid max-w-xl gap-md">
          <Input placeholder="Email address" />
          <Input variant="search" placeholder="Search for anything…" />
          <Input placeholder="Errored field" error defaultValue="not-an-email" />
          <Input placeholder="Disabled" disabled />
        </div>
      </Section>

      {/* Badges */}
      <Section
        title="Badge (Topic)"
        hint="10 tokens · soft (chip) and solid (cover overlay) variants."
      >
        <Row>
          {BADGE_TOPICS.map((topic) => (
            <Badge key={topic} topic={topic} />
          ))}
        </Row>
        <Row>
          {BADGE_TOPICS.map((topic) => (
            <Badge key={topic} topic={topic} variant="solid" />
          ))}
        </Row>
      </Section>

      {/* Avatars */}
      <Section
        title="Avatar"
        hint="Sizes sm/md/lg · orbital variant (slow rotating ring, §7)."
      >
        <Row>
          <Avatar name="Alex Curio" size="sm" />
          <Avatar name="Alex Curio" size="md" />
          <Avatar name="Alex Curio" size="lg" />
          <Avatar name="You" size="lg" orbital />
          <Avatar name="Clara Martin" size="md" orbital />
        </Row>
      </Section>

      {/* Cards */}
      <Section
        title="Card — Collection (title below)"
        hint="My Space shape: cover on top, then title + owner + links. Curator card alongside."
      >
        <div className="grid gap-lg sm:grid-cols-2 lg:grid-cols-3">
          <CollectionCard
            title="Amalfi Coast Travel Guide"
            topic="travel"
            owner={{ name: 'Clara Martin' }}
            linksCount={241}
          />
          <CollectionCard
            title="Books That Changed My Perspective"
            topic="books"
            owner={{ name: 'Luca Moretti' }}
            linksCount={186}
          />
          <CuratorCard
            name="Clara Martin"
            topic="travel"
            role="Travel Curator"
            bio="Sharing places, hotels and experiences that make the world feel smaller."
            followers={24300}
            action={
              <Button variant="secondary" size="small">
                Follow
              </Button>
            }
          />
        </div>
      </Section>

      {/* Collection card — overlay-title variant (Home "Picked for you") */}
      <Section
        title="Card — Collection (title overlay)"
        hint='Home "Picked for you" shape: full-bleed cover with the title, teaser and owner/links laid over a dark scrim.'
      >
        <div className="grid gap-lg sm:grid-cols-2 lg:grid-cols-4">
          <CollectionCard
            variant="overlay"
            title="The Amalfi Coast Travel Guide"
            description="Hidden gems, local spots and breathtaking views."
            topic="travel"
            owner={{ name: 'Clara Martin' }}
            linksCount={241}
          />
          <CollectionCard
            variant="overlay"
            title="Books That Changed My Perspective"
            description="A collection of reads that stayed with me."
            topic="books"
            owner={{ name: 'Luca Moretti' }}
            linksCount={186}
          />
          <CollectionCard
            variant="overlay"
            title="Timeless Interiors"
            description="Spaces that blend aesthetics with soul."
            topic="design"
            owner={{ name: 'Jeanne Dumas' }}
            linksCount={132}
          />
          <CollectionCard
            variant="overlay"
            title="Tokyo Eats: A Local's Guide"
            description="Where to eat, what to order, and what not to miss."
            topic="food"
            owner={{ name: 'Paul Fuentes' }}
            linksCount={98}
          />
        </div>
      </Section>

      {/* Tabs */}
      <Section title="Tabs" hint="Underline (with counts) and pill (filters).">
        <Tabs
          variant="underline"
          value={underlineTab}
          onValueChange={setUnderlineTab}
          items={[
            { value: 'links', label: 'Links', count: 48 },
            { value: 'about', label: 'About' },
            { value: 'notes', label: 'Notes', count: 3 },
          ]}
        />
        <Tabs
          variant="pill"
          value={pillTab}
          onValueChange={setPillTab}
          items={[
            { value: 'all', label: 'All' },
            { value: 'travel', label: 'Travel' },
            { value: 'style', label: 'Style' },
            { value: 'books', label: 'Books' },
            { value: 'food', label: 'Food' },
          ]}
        />
      </Section>

      {/* Modal */}
      <Section title="Modal" hint="Centered panel and bottom sheet (mobile).">
        <Row>
          <Button variant="secondary" onClick={() => setCenterOpen(true)}>
            Open centered modal
          </Button>
          <Button variant="secondary" onClick={() => setSheetOpen(true)}>
            Open bottom sheet
          </Button>
        </Row>
        <Modal
          open={centerOpen}
          onClose={() => setCenterOpen(false)}
          title="Create a collection"
        >
          <p>
            Centered panel with overlay, radius lg and shadow-md. Press Escape or
            click the overlay to close.
          </p>
        </Modal>
        <Modal
          open={sheetOpen}
          onClose={() => setSheetOpen(false)}
          variant="sheet"
          title="Save a link"
        >
          <p>Bottom sheet — slides up from the bottom edge on mobile.</p>
        </Modal>
      </Section>

      {/* Theme toggle */}
      <Section
        title="Theme toggle"
        hint="Cosmic/Archive switch — flips .dark on <html> (not persisted, per scope)."
      >
        <ThemeToggle />
      </Section>
    </div>
  )
}
