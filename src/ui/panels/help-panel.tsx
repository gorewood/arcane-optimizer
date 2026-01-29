/**
 * HelpPanel — tutorial and documentation for using the optimizer.
 *
 * Explains goals, weights, constraint types, and search algorithms.
 */

// ---------------------------------------------------------------------------
// HelpPanel
// ---------------------------------------------------------------------------

export function HelpPanel(): React.JSX.Element {
  return (
    <div className="p-4 space-y-6 max-w-3xl">
      {/* General overview */}
      <QuickStart />
      {/* Optimizer tab */}
      <GoalsSection />
      <WeightsSection />
      <ConstraintTypesSection />
      <TipsSection />
      <SearchAlgorithmsSection />
      <ScoringDetailsSection />
      {/* Gear Inventory tab */}
      <GearInventorySection />
      {/* Game Data tab */}
      <GameDataSection />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section Components
// ---------------------------------------------------------------------------

function QuickStart(): React.JSX.Element {
  return (
    <Section title="Quick Start">
      <ol className="list-decimal list-inside space-y-2 text-text-secondary">
        <li>
          <strong className="text-text-primary">Select a profile</strong> or create custom goals in the Optimizer tab
        </li>
        <li>
          <strong className="text-text-primary">Enable gear</strong> in the Gear Inventory tab (items are disabled by
          default)
        </li>
        <li>
          <strong className="text-text-primary">Choose an algorithm</strong> — Exhaustive for small pools, Genetic for
          large ones
        </li>
        <li>
          <strong className="text-text-primary">Click Start Search</strong> to find optimal loadouts
        </li>
      </ol>
    </Section>
  );
}

function GearInventorySection(): React.JSX.Element {
  return (
    <Section title="Gear Inventory">
      <p className="text-text-secondary mb-3">
        The Gear Inventory shows all equipment available for optimization. Toggle items on/off to control what the
        optimizer can use.
      </p>
      <dl className="space-y-2">
        <dt className="font-semibold text-accent-gold">Grouping</dt>
        <dd className="text-text-secondary ml-4">
          Organize items by <strong className="text-text-primary">Set</strong> (armor sets),{" "}
          <strong className="text-text-primary">Slot</strong> (helmet, armor, accessory),{" "}
          <strong className="text-text-primary">Source</strong> (craftable, boss drop, seasonal), or{" "}
          <strong className="text-text-primary">None</strong> (flat list).
        </dd>
        <dt className="font-semibold text-accent-gold">Filtering</dt>
        <dd className="text-text-secondary ml-4">
          Use quick filters to show only enabled/disabled items, or search by name.
        </dd>
        <dt className="font-semibold text-accent-gold">Sources</dt>
        <dd className="text-text-secondary ml-4">
          Items show their source (Craftable, Boss, Seasonal, Quest, etc.) to help you filter by availability.
        </dd>
        <dt className="font-semibold text-accent-gold">Custom Items</dt>
        <dd className="text-text-secondary ml-4">
          Click <strong className="text-text-primary">+ Add</strong> to create custom equipment for theorycrafting
          unreleased or hypothetical gear.
        </dd>
      </dl>
    </Section>
  );
}

function GameDataSection(): React.JSX.Element {
  return (
    <Section title="Game Data">
      <p className="text-text-secondary mb-3">
        The Game Data tab manages enchantments, modifiers, gems, and variants — the building blocks that define
        equipment stats.
      </p>
      <dl className="space-y-2">
        <dt className="font-semibold text-accent-gold">Enchantments</dt>
        <dd className="text-text-secondary ml-4">Magic effects like Powerful, Forceful, Hard that modify equipment.</dd>
        <dt className="font-semibold text-accent-gold">Modifiers</dt>
        <dd className="text-text-secondary ml-4">Material/quality modifiers like Titanium, Virtuous that change stats.</dd>
        <dt className="font-semibold text-accent-gold">Gems</dt>
        <dd className="text-text-secondary ml-4">Socketable gems that add bonus stats to equipment.</dd>
        <dt className="font-semibold text-accent-gold">Variants</dt>
        <dd className="text-text-secondary ml-4">Equipment variants like Arcsphere, Sunken, etc.</dd>
      </dl>
      <p className="text-text-muted text-sm mt-3">
        Most users won't need to edit game data — it's pre-loaded from the latest game version. Use{" "}
        <strong className="text-text-primary">+ Add</strong> to add custom entries for theorycrafting.
      </p>
    </Section>
  );
}

function GoalsSection(): React.JSX.Element {
  return (
    <Section title="Understanding Goals">
      <p className="text-text-secondary mb-3">
        Goals (constraints) tell the optimizer what stats matter to you. Each goal has three parts:
      </p>
      <dl className="space-y-2">
        <dt className="font-semibold text-accent-gold">Stat</dt>
        <dd className="text-text-secondary ml-4">
          The stat to optimize (power, defense, size, dexterity, etc.)
        </dd>
        <dt className="font-semibold text-accent-gold">Type</dt>
        <dd className="text-text-secondary ml-4">
          How to optimize it — maximize, minimize, hit a threshold, etc.
        </dd>
        <dt className="font-semibold text-accent-gold">Weight</dt>
        <dd className="text-text-secondary ml-4">
          How important this goal is relative to others (1–100)
        </dd>
      </dl>
    </Section>
  );
}

function WeightsSection(): React.JSX.Element {
  return (
    <Section title="How Weights Work">
      <p className="text-text-secondary mb-3">
        Weights determine priority when goals conflict. Higher weight = more important.
      </p>
      <div className="bg-bg-elevated rounded-md p-3 text-sm space-y-2">
        <p className="text-text-secondary">
          <strong className="text-text-primary">Example:</strong> You want high defense but also some power.
        </p>
        <ul className="list-disc list-inside text-text-secondary ml-2">
          <li>Defense (maximize) weight: 80</li>
          <li>Power (maximize) weight: 20</li>
        </ul>
        <p className="text-text-secondary">
          The optimizer will prioritize defense 4:1 over power, but still consider power as a tiebreaker.
        </p>
      </div>
      <p className="text-text-muted text-sm mt-3">
        Tip: Start with one goal at weight 50, then add others at lower weights to fine-tune.
      </p>
    </Section>
  );
}

function ConstraintTypesSection(): React.JSX.Element {
  return (
    <Section title="Constraint Types">
      <div className="space-y-3">
        <ConstraintType
          symbol="max"
          name="Maximize"
          description="Higher values are better. Score increases linearly with the stat."
          example="Maximize power — a build with 200 power scores higher than one with 150."
        />
        <ConstraintType
          symbol="min"
          name="Minimize"
          description="Lower values are better. Useful for drawback, insanity."
          example="Minimize drawback — a build with 5 drawback beats one with 10."
        />
        <ConstraintType
          symbol="≥"
          name="At Least"
          description="Must reach a minimum value. Heavy penalty below threshold, small bonus above."
          example="Defense ≥ 1000 — builds under 1000 defense are strongly penalized."
        />
        <ConstraintType
          symbol="≤"
          name="At Most"
          description="Hard cap — builds exceeding this are disqualified entirely."
          example="Insanity ≤ 3 — any build with 4+ insanity won't appear in results."
        />
        <ConstraintType
          symbol="↔"
          name="Between"
          description="Stay within a range. Penalty for going outside either bound."
          example="Size between 100–200 — penalizes builds below 100 or above 200."
        />
        <ConstraintType
          symbol="="
          name="Exactly"
          description="Must match exactly. Builds that don't match are disqualified."
          example="Warding = 4 — only builds with exactly 4 warding appear."
        />
      </div>
    </Section>
  );
}

function SearchAlgorithmsSection(): React.JSX.Element {
  return (
    <Section title="Search Algorithms">
      <div className="space-y-4">
        <div>
          <h4 className="font-semibold text-accent-gold mb-1">Exhaustive Search</h4>
          <p className="text-text-secondary text-sm">
            Tries every possible combination. <strong className="text-text-primary">Guaranteed optimal</strong> results
            but only practical for small gear pools (under ~1 million combinations).
          </p>
          <p className="text-text-muted text-sm mt-1">
            Best for: Limited gear selection, when you need the absolute best builds.
          </p>
        </div>
        <div>
          <h4 className="font-semibold text-accent-gold mb-1">Genetic Algorithm (GA)</h4>
          <p className="text-text-secondary text-sm">
            Evolves a population of builds over generations, keeping good traits and mutating others.
            <strong className="text-text-primary"> Finds excellent results fast</strong> but may miss the theoretical optimum.
          </p>
          <p className="text-text-muted text-sm mt-1">
            Best for: Large gear pools, quick iteration, exploring build diversity.
          </p>
          <div className="mt-2 text-sm text-text-secondary">
            <span className="text-text-muted">Parameters:</span>
            <ul className="list-disc list-inside ml-2">
              <li><strong>Pop</strong> — Population size. Larger = more diversity, slower.</li>
              <li><strong>Gens</strong> — Generations to evolve. More = better results, longer runtime.</li>
              <li><strong>Mut%</strong> — Mutation rate. Higher = more exploration, less refinement.</li>
            </ul>
          </div>
        </div>
      </div>
    </Section>
  );
}

function ScoringDetailsSection(): React.JSX.Element {
  return (
    <Section title="How Scoring Works">
      <p className="text-text-secondary mb-3">
        Each build gets a fitness score based on how well it meets your goals. Higher = better.
      </p>
      <div className="bg-bg-elevated rounded-md p-3 text-sm space-y-2">
        <p className="text-text-primary font-semibold">Score calculation:</p>
        <ul className="list-disc list-inside text-text-secondary space-y-1">
          <li>
            <strong>Maximize/Minimize:</strong> stat value × weight (negated for minimize)
          </li>
          <li>
            <strong>At Least:</strong> Heavy penalty (10×) for being below target; capped bonus for exceeding
          </li>
          <li>
            <strong>Between:</strong> Heavy penalty (10×) for being outside the range
          </li>
          <li>
            <strong>At Most/Exactly:</strong> Disqualification (score = −∞) if not satisfied
          </li>
        </ul>
      </div>
      <p className="text-text-muted text-sm mt-3">
        The 10× penalty ensures thresholds are strongly enforced — missing "defense ≥ 1000" by 50 points
        costs much more than gaining 50 extra power.
      </p>
    </Section>
  );
}

function TipsSection(): React.JSX.Element {
  return (
    <Section title="Tips">
      <ul className="list-disc list-inside space-y-2 text-text-secondary">
        <li>
          <strong className="text-text-primary">Use At Least for minimums</strong> — It penalizes builds
          that fall short rather than disqualifying them entirely.
        </li>
        <li>
          <strong className="text-text-primary">Use At Most sparingly</strong> — It's a hard cutoff.
          Only use for true limits like insanity tolerance.
        </li>
        <li>
          <strong className="text-text-primary">Start simple</strong> — One or two goals first,
          then add complexity as needed.
        </li>
        <li>
          <strong className="text-text-primary">Check the Gear Inventory</strong> — Results can only use enabled items.
          Enable more gear for better builds.
        </li>
        <li>
          <strong className="text-text-primary">Compare algorithms</strong> — Run both on the same goals
          to see if GA found the optimal or a near-optimal solution.
        </li>
      </ul>
    </Section>
  );
}

// ---------------------------------------------------------------------------
// Shared Components
// ---------------------------------------------------------------------------

function Section({
  title,
  children,
}: {
  readonly title: string;
  readonly children: React.ReactNode;
}): React.JSX.Element {
  return (
    <section>
      <h2 className="text-lg font-bold text-accent-gold border-b border-border-subtle pb-1 mb-3">
        {title}
      </h2>
      {children}
    </section>
  );
}

function ConstraintType({
  symbol,
  name,
  description,
  example,
}: {
  readonly symbol: string;
  readonly name: string;
  readonly description: string;
  readonly example: string;
}): React.JSX.Element {
  return (
    <div className="bg-bg-elevated rounded-md p-2">
      <div className="flex items-center gap-2 mb-1">
        <span className="font-stat text-accent-gold w-8 text-center">{symbol}</span>
        <span className="font-semibold text-text-primary">{name}</span>
      </div>
      <p className="text-text-secondary text-sm ml-10">{description}</p>
      <p className="text-text-muted text-xs ml-10 mt-1 italic">{example}</p>
    </div>
  );
}
