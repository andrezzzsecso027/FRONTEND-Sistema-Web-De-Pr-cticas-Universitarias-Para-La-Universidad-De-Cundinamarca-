import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PanelEmpresa } from './panel-empresa';

describe('PanelEmpresa', () => {
  let component: PanelEmpresa;
  let fixture: ComponentFixture<PanelEmpresa>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PanelEmpresa],
    }).compileComponents();

    fixture = TestBed.createComponent(PanelEmpresa);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
