import type { TrackData, TrackGenerationParams } from './TrackTypes';

export class TrackGeneratorPanel {
  readonly element = document.createElement('aside');
  private readonly form = document.createElement('form');
  private readonly stats = document.createElement('div');
  private readonly status = document.createElement('div');
  private readonly raceButton = document.createElement('button');

  constructor(
    root: HTMLElement,
    params: TrackGenerationParams,
    private readonly onGenerate: (params: TrackGenerationParams) => void,
    private readonly onRace: () => void,
  ) {
    this.element.className = 'generator-panel';
    this.element.innerHTML = `
      <div class="generator-heading">
        <span class="eyebrow">Circuit workshop</span>
        <h1>Track generator</h1>
        <p>Build a circuit from exact straights and constant-radius corners.</p>
      </div>
    `;

    this.form.className = 'generator-form';
    this.form.innerHTML = `
      <div class="field-grid">
        ${this.numberField('seed', 'Seed', params.seed, 0, 999999, 1)}
        ${this.selectField('longStraightCount', 'Long straights', params.longStraightCount, [1, 2])}
        ${this.numberField('cornerCount', 'Corners', params.cornerCount, 5, 14, 1)}
        ${this.numberField('roadWidth', 'Road width', params.roadWidth, 12, 24, 1)}
      </div>

      <fieldset>
        <legend>Corner shape</legend>
        <div class="field-grid">
          ${this.numberField('minCornerAngleDeg', 'Min angle', params.minCornerAngleDeg, 15, 90, 5, '°')}
          ${this.numberField('maxCornerAngleDeg', 'Max angle', params.maxCornerAngleDeg, 95, 175, 5, '°')}
          ${this.numberField('tightCornerRadiusMin', 'Tight radius min', params.tightCornerRadiusMin, 16, 40, 1)}
          ${this.numberField('tightCornerRadiusMax', 'Tight radius max', params.tightCornerRadiusMax, 20, 55, 1)}
          ${this.numberField('wideCornerRadiusMin', 'Wide radius min', params.wideCornerRadiusMin, 28, 75, 1)}
          ${this.numberField('wideCornerRadiusMax', 'Wide radius max', params.wideCornerRadiusMax, 38, 100, 1)}
        </div>
        <label class="range-field">
          <span>Tight corner mix</span>
          <input name="tightCornerRatio" type="range" min="0.15" max="0.9" step="0.01" value="${params.tightCornerRatio}">
        </label>
      </fieldset>

      <fieldset>
        <legend>Straights</legend>
        <div class="field-grid">
          ${this.numberField('normalStraightMinLength', 'Normal min', params.normalStraightMinLength, 10, 50, 1)}
          ${this.numberField('normalStraightMaxLength', 'Normal max', params.normalStraightMaxLength, 24, 80, 1)}
          ${this.numberField('longStraightMinLength', 'Long min', params.longStraightMinLength, 55, 140, 1)}
          ${this.numberField('longStraightMaxLength', 'Long max', params.longStraightMaxLength, 75, 180, 1)}
        </div>
      </fieldset>

      <div class="generator-actions">
        <button class="primary-action" type="submit">Generate track</button>
        <button class="secondary-action" type="button" data-action="new-seed">Random seed</button>
      </div>
    `;
    this.form.addEventListener('submit', this.handleSubmit);
    this.form.querySelector('[data-action="new-seed"]')?.addEventListener('click', () => {
      const seed = this.form.elements.namedItem('seed');
      if (seed instanceof HTMLInputElement) {
        seed.value = String(Math.floor(Math.random() * 1_000_000));
      }
      this.submit();
    });

    this.status.className = 'generator-status';
    this.stats.className = 'generator-stats';
    this.raceButton.type = 'button';
    this.raceButton.className = 'race-action';
    this.raceButton.textContent = 'Race this track';
    this.raceButton.addEventListener('click', this.onRace);

    this.element.append(this.form, this.status, this.stats, this.raceButton);
    root.append(this.element);
  }

  setTrack(track: TrackData) {
    const corners = track.segments.filter((segment) => segment.type === 'corner');
    const hairpins = corners.filter(
      (corner) => Math.abs((corner.sweepRadians * 180) / Math.PI) >= 125,
    );
    const longStraights = track.segments.filter(
      (segment) => segment.type === 'straight' && segment.long,
    );
    this.status.textContent = '';
    this.status.classList.remove('error');
    this.stats.innerHTML = `
      <div><strong>${track.totalLength.toFixed(0)} m</strong><span>length</span></div>
      <div><strong>${corners.length}</strong><span>corners</span></div>
      <div><strong>${hairpins.length}</strong><span>hairpins</span></div>
      <div><strong>${longStraights.map((segment) => segment.length.toFixed(0)).join(' / ')} m</strong><span>long straight${longStraights.length === 1 ? '' : 's'}</span></div>
      <div><strong>${track.generationAttempts}</strong><span>attempts</span></div>
    `;
    this.raceButton.disabled = false;
  }

  setError(message: string) {
    this.status.textContent = message;
    this.status.classList.add('error');
  }

  setVisible(visible: boolean) {
    this.element.hidden = !visible;
  }

  submit() {
    this.form.requestSubmit();
  }

  setSeedAndSubmit(seed: number) {
    const input = this.form.elements.namedItem('seed');
    if (input instanceof HTMLInputElement) input.value = String(seed);
    this.submit();
  }

  private handleSubmit = (event: SubmitEvent) => {
    event.preventDefault();
    const data = new FormData(this.form);
    const number = (name: string) => Number(data.get(name));
    this.onGenerate({
      seed: number('seed'),
      cornerCount: number('cornerCount'),
      longStraightCount: number('longStraightCount') === 2 ? 2 : 1,
      minCornerAngleDeg: number('minCornerAngleDeg'),
      maxCornerAngleDeg: number('maxCornerAngleDeg'),
      tightCornerRadiusMin: number('tightCornerRadiusMin'),
      tightCornerRadiusMax: number('tightCornerRadiusMax'),
      wideCornerRadiusMin: number('wideCornerRadiusMin'),
      wideCornerRadiusMax: number('wideCornerRadiusMax'),
      tightCornerRatio: number('tightCornerRatio'),
      normalStraightMinLength: number('normalStraightMinLength'),
      normalStraightMaxLength: number('normalStraightMaxLength'),
      longStraightMinLength: number('longStraightMinLength'),
      longStraightMaxLength: number('longStraightMaxLength'),
      roadWidth: number('roadWidth'),
    });
  };

  private numberField(
    name: keyof TrackGenerationParams,
    label: string,
    value: number,
    min: number,
    max: number,
    step: number,
    suffix = '',
  ) {
    return `<label><span>${label}</span><span class="input-wrap"><input name="${name}" type="number" min="${min}" max="${max}" step="${step}" value="${value}">${suffix}</span></label>`;
  }

  private selectField(
    name: keyof TrackGenerationParams,
    label: string,
    value: number,
    options: number[],
  ) {
    return `<label><span>${label}</span><select name="${name}">${options.map((option) => `<option value="${option}"${value === option ? ' selected' : ''}>${option}</option>`).join('')}</select></label>`;
  }
}
