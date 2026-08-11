import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { CircleBrand } from './CircleBrand';

describe('CircleBrand', () => {
  it('uses the Fractionl icon as the default product signature', () => {
    const { container } = render(<CircleBrand />);

    expect(screen.getByRole('img', { name: 'Circle by Fractionl' })).toBeVisible();
    expect(container.querySelector('.circle-brand-parent-icon')).toBeInTheDocument();
    expect(container.querySelector('.circle-brand-wordmark')).not.toBeInTheDocument();
  });

  it('uses the full Fractionl wordmark at acquisition and account moments', () => {
    const { container } = render(<CircleBrand signature="wordmark" />);

    expect(screen.getByRole('img', { name: 'Circle by Fractionl' })).toBeVisible();
    expect(container.querySelector('.circle-brand-wordmark')).toBeInTheDocument();
    expect(container.querySelector('.circle-brand-parent-icon')).not.toBeInTheDocument();
  });

  it('can render the Circle identity without a parent signature', () => {
    const { container } = render(<CircleBrand signature="none" />);

    expect(screen.getByRole('img', { name: 'Circle' })).toBeVisible();
    expect(container.querySelector('.circle-brand-parent')).not.toBeInTheDocument();
  });
});
