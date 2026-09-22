import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Navbar } from '../../../../share/ui/navbar/navbar';
import { Footer } from '../../../../share/ui/footer/footer';
@Component({
  imports: [Navbar,Footer,RouterLink],
  selector: 'app-login',
  styleUrl: './login.scss',
  templateUrl: './login.html',
})
export class Login {}
