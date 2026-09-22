import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Navbar } from '../../../../share/ui/navbar/navbar';
import { Footer } from '../../../../share/ui/footer/footer';
@Component({
  imports: [RouterLink,Navbar,Footer],
  selector: 'app-registro',
  styleUrl: './registro.scss',
  templateUrl: './registro.html',
})
export class Registro {}
