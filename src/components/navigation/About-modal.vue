<template>
    <div>
        <b-modal
            header-class="title-header"
            footer-class="title-footer"
            ref="AboutModalRef"
            id="AboutModal"
            aria-role="dialog"
            aria-label="About Modal"
            :width="640" scroll="keep"
            ok-only
            trap-focus
            :destroy-on-hide="true"
            @shown="shown"
        >
            <template v-slot:modal-header>
                <b-row>
                    <b-col cols="12"> <b>{{ $t('home.home') }} </b> </b-col>
                </b-row>

            </template>

            <b-container fluid>
                <p>The <i>SQE</i> project is a German-Israeli co­operation financed through the<br><a href="http://www.dfg.de/en/research_funding/programmes/international_cooperation/german_israeli_cooperation/index.html">German-Israeli Project Coordi­nation (DIP)</a> of the <a href="http://www.dfg.de/en/"> DFG (German Research Foundation)</a>.</p>
                <p>The SQE platform is the result of the input and dedicated work of many researchers and software developers. We would like to thank all who participated directly or indirectly in bringing this platform to fruition.</p>
                <p>For more detailed information about the SQE project please visit our <a href="https://qumranica.org" target="_blank">project website</a>.</p>
                <ul>
                    <li>
                        <h4><strong>Prof. Dr. <a href="https://www.uni-goettingen.de/en/56085.html">Reinhard G. Kratz</a>, Faculty of Theology, Department of Old Testament Studies, University of Göttingen &amp; Göttingen Academy of Sciences and Humanities</strong></h4>
                        <ul>
                            <li>Dr. <a href="https://brown-devost.com"><strong>Bronson Brown-deVost</strong></a> (see below) — Books of Samuel Mss.</li>
                            <li>Dr. <strong>Peter Porzig</strong>, University of Göttingen — Damascus Document Mss.</li>
                            <li><strong>Martin Schröter</strong>, University of Göttingen, IT</li>
                            <li><strong>James Tucker</strong>, PhD, Universities of Göttingen and Toronto — Community Rule (1QS) and Damascus Document Mss.</li>
                        </ul>
                    </li>
                    <li>
                        <h4><strong>Prof. <a href="https://telaviv.academia.edu/JonathanBenDov">Jonathan Ben-Dov</a>, PhD, now at Department of&nbsp; Bible, Tel Aviv University</strong></h4>
                        <ul>
                            <li><a href="https://haifa.academia.edu/HilaDayfani"><strong>Hila Dayfani</strong></a>, PhD, Faculty of Humanities, Department of Biblical Studies, University of Haifa — 4QInstruction Mss. (4Q415)</li>
                            <li><a href="https://huji.academia.edu/ShlomiEfrati"><strong>Shlomi Efrati</strong></a>, PhD, Faculty of Humanities, Department of Biblical Studies, University of Haifa — 4QInstruction Mss. (4Q416)</li>
                            <li><a href="https://haifa.academia.edu/AsafGayer"><strong>Asaf Gayer</strong></a>, PhD (cand.), Faculty of Humanities, Department of Biblical Studies, University of Haifa — 4QInstruction Mss. (4Q418, 418*), Rule of the Congregation (cryptic)</li>
                            <li><a href="https://haifa.academia.edu/YoelHalevi"><strong>Yoel Halevi</strong></a>, M.A. Student, Faculty of Humanities, Department of Biblical Studies, University of Haifa — 4QInstruction Mss. (4Q418 catalog, 4Q418*), general research assistant</li>
                            <li><a href="https://ariel.academia.edu/EshbalRatson"><strong>Eshbal Ratson</strong></a>, PhD, now at Faculty of Social Sciences, Israel Heritage Department, University of Ariel — 4QInstruction Mss., Cryptic (4Q317), Astronomical Book of Enoch (4Q208)</li>
                            <li><a href="https://bham.academia.edu/AnnaShirav"><strong>Anna Shirav</strong></a>, PhD (cand.), Faculty of Humanities, Department of Biblical Studies, University of Haifa — 4QInstruction Mss. (4Q417)</li>
                            <li><strong>Yigal Bloch</strong>, University of Haifa</li>
                        </ul>
                    </li>
                    <li>
                        <h4><strong>Prof. <a href="https://www.cs.tau.ac.il/~nachumd/Homepage.html">Nachum Dershowitz</a>, PhD, School of Computer Science, Tel Aviv University (Cooperating Principal Investigator)</strong></h4>
                        <ul>
                            <li>Prof. <a style="font-size: 16px;" href="http://www.cs.tau.ac.il/~wolf/"><strong>Lior Wolf</strong></a><span style="font-size: 16px;">, PhD, School of Computer Science, Tel Aviv University</span></li>
                            <li><a href="https://www.facebook.com/lena.dankin"><strong>Lena Dankin</strong></a>, School of Computer Science, Tel Aviv University</li>
                            <li><a href="https://www.researchgate.net/profile/Anat-Gilenson"><strong>Anat Gilenson</strong></a>, School of Computer Science, Tel Aviv University</li>
                            <li><a href="https://telaviv.academia.edu/olyasirkin"><strong>Olya Sirkin</strong></a>, School of Computer Science, Tel Aviv University</li>
                            <li><strong>Taivanbat Badamdorj</strong>, School of Computer Science, Tel Aviv University</li>
                            <li><strong>Adiel Ben Shalom</strong>, School of Computer Science, Tel Aviv University</li>
                        </ul>
                    </li>
                    <li>
                        <h4 id="pinst"><strong>Priv.-Doz. Dr. <a href="https://www.uni-muenster.de/EvTheol/personen/kottsieper.html">Ingo Kottsieper</a>, Göttingen Academy of Sciences and Humanities (Head of IT)</strong></h4>
                    </li>
                </ul>
                <h2>Partner Institutions</h2>
                <ul>
                    <li>
                        <h4><strong>Israel Antiquities Authorities (IAA)</strong></h4>
                        <ul>
                            <li>
                                <h5><strong><a href="https://antiquities.academia.edu/JoeUziel">Joe Uziel</a>, PhD, Head of Dead Sea Scrolls Department, Israel Antiquities Authority, Jerusalem</strong></h5>
                                <ul>
                                    <li><a href="https://huji.academia.edu/OrenAbleman"><strong>Oren Ableman</strong></a>, PhD, Dead Sea Scrolls Department, Israel Antiquities Authority, Jerusalem &nbsp;</li>
                                    <li><a href="https://independent.academia.edu/BRiestra"><strong>Beatriz Riestra</strong></a>, Dead Sea Scrolls Department, Israel Antiquities Authority, Jerusalem</li>
                                    <li><a href="https://independent.academia.edu/oritrosengarten"><strong>Orit Rosen­garten-Kuslanski</strong></a>, Dead Sea Scrolls Department, Israel Antiquities Authority, Jerusalem</li>
                                </ul>
                            </li>
                            <li>Dr. h.c. <strong>Pnina Shor</strong>, Head of Dead Sea Scrolls Department, Israel Antiquities Authority, Jerusalem</li>
                        </ul>
                    </li>
                    <li>
                        <h4><strong>Tel Aviv University, Dept. of Hebrew Culture Studies</strong></h4>
                        <ul>
                            <li>
                            <h5><strong>Prof. <a href="https://telaviv.academia.edu/NoamMizrahi">Noam Mizrahi</a>, PhD, now at Hebrew University, Jerusalem</strong></h5>
                            <ul>
                            <li><a href="https://independent.academia.edu/einavfleck"><strong>Einav Fleck</strong></a>, Department of Hebrew Culture Studies, Tel Aviv University — Biblical Variants</li>
                            </ul>
                            </li>
                        </ul>
                    </li>
                    <li>
                    <h4><strong>École Pratique des Hautes Études, Paris, Section des Sciences Histo­riques et Philo­logiques</strong></h4>
                    <ul>
                    <li>
                    <h5><strong>Prof. <a href="https://ephe.academia.edu/danielstoekl">Daniel Stökl Ben Ezra</a>, PhD, Section des Sciences Histo­riques et Philo­logiques, École Pratique des Hautes Études, Paris</strong></h5>
                    <ul>
                    <li>
                    <p id="former"><a href="https://ephe.academia.edu/AntonyPerrot"><strong>Antony Perrot</strong></a>, Section des Sciences Histo­riques et Philo­logiques, École Pratique des Hautes Études, Paris — Qumran Opistographs&nbsp;</p>
                    </li>
                    </ul>
                    </li>
                    </ul>
                    </li>
                </ul>
                <h2>Additional Contributers</h2>
                <ul>
                <li><strong>Itai Ben-Shlush</strong>, National Library of Israel, Jerusalem</li>
                <li><strong>Shlomo Carmi</strong> National Library of Israel, Jerusalem</li>
                <li><strong>Elishai Cohen</strong> National Library of Israel, Jerusalem</li>
                <li><strong>Oded Essner</strong>, Tel Aviv University</li>
                <li><strong>Shalom Fox</strong>, Israel Antiquities Authority, Jerusalem</li>
                <li><strong>Jan Fritsche</strong>, University of Potsdam</li>
                <li><strong>Ricki Heicklen</strong>, Princeton University</li>
                <li><strong>Spencer Jones</strong>, WireWheel.io, Arlington, Va.</li>
                <li><strong>Gil Levi, </strong>Tel Aviv University</li>
                <li><strong>Hadar Miller</strong>, National Library of Israel, Jerusalem</li>
                <li><strong>Pinhas Nisnevitch</strong>, Tel Aviv University</li>
                <li><strong>Shani Tzoref, </strong>University of Potsdam — Founding Member</li>
                <li><strong>Lior Uzan, </strong>Tel Aviv University</li>
                </ul>
                <h2>Project Manager</h2>
                <ul>
                <li>
                <h5><strong>Dr. <a href="https://brown-devost.com">Bronson Brown-deVost</a>, </strong><strong>University of Göttingen, Faculty </strong><strong>of Theology, Department of Old Testament Studies, </strong><strong>Contact: <a href="mailto:bbrownd@gwdg.de">bbrownd@gwdg.de</a></strong></h5>
                </li>
                </ul>

                <div class="col-6 align-self-center">
                    <div class="container">
                        <div class="row logos">
                            <div class="col p-3">
                                <b-link href="https://gepris.dfg.de/gepris/projekt/282601852?language=en" target="_blank">
                                    <img
                                        src="@/assets/images/logo_dfg.svg"
                                        alt="DFG Project Details"
                                    />
                                </b-link>
                            </div>
                            <div class="w-100"></div>
                            <div class="col p-3">
                                <b-link
                                    href="http://www.antiquities.org.il/default_en.aspx" target="_blank">
                                    <img
                                        src="@/assets/images/logo_antiquity.png"
                                        alt="Israel Antiquities Authority logo"
                                    />
                                </b-link>
                           </div>
                            <div class="w-100"></div>
                            <div class="col p-3">
                                <b-link href="https://english.tau.ac.il/" target="_blank">
                                    <img
                                        src="@/assets/images/logo_tlv.png"
                                        alt="University of TLV logo"
                                    />
                                </b-link>
                            </div>
                            <div class="w-100"></div>
                            <div class="col p-3">
                                <b-link href="https://www.uni-goettingen.de/" target="_blank">
                                    <img
                                        src="@/assets/images/logo_gottingen.png"
                                        alt="University of Göttingen logo"
                                    />
                                </b-link>
                            </div>
                            <div class="w-100"></div>
                            <div class="col p-3">
                                <b-link href="https://www.haifa.ac.il/" target="_blank">
                                    <img
                                        src="@/assets/images/logo_haifa.png"
                                        alt="University of Haifa logo"
                                    />
                                </b-link>
                            </div>
                            <div class="w-100"></div>
                            <div class="col p-3">
                                <b-link href="https://adw-goe.de/startseite/" target="_blank">
                                    <img
                                        src="@/assets/images/logo_adwg.svg"
                                        alt="Akademie der Wissenschaften zu Göttingen"
                                    />
                                </b-link>
                            </div>
                        </div>
                    </div>
                </div>
            </b-container>

        </b-modal>

    </div>
</template>


<script lang="ts">
import { Component, Prop, Emit, Vue } from 'vue-property-decorator';

@Component({
    name: 'About',
    components: {
    }
})

export default class AboutModal extends Vue {
    private shown(): void {
        console.log('About Modal');

    }

}

</script>
<style lang="scss">
@import '@/assets/styles/_variables.scss';
@import '@/assets/styles/_fonts.scss';
.title-header {
    font-family: $font-family;
    font-style: $font-style;
    font-weight: $font-weight-4;
    font-size: $font-size-4;
    line-height: 38px;
    letter-spacing: 0.28px;
    justify-content: center !important;
    border: unset !important;
}
.title-footer{
    border: unset !important;
    }
button.btn.btn-login-modal.btn-primary.btn-block {
    padding: 14px;
    background: $blue;
    border-radius: 3px;
    font-weight:$font-weight-2;
    font-style: $font-style;
    font-size: $font-size-1;
}
::placeholder {
    color: $dark-grey!important;
    font-size: $font-size-1;
}
.modal-content{
    border-radius:0px!important;
}
.sign-link{
    font-size: $font-size-1;
    font-weight:$font-weight-1;
    padding-top: 5px;

}
.logos {
    .col {
        text-align: center;
    }
    img {
        max-height: 70px;
        padding: 10px;
    }
}
</style>