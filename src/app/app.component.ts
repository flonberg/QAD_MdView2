import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, ParamMap } from '@angular/router';
import * as Highcharts from 'highcharts';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { isDevMode } from '@angular/core';
import { Router } from '@angular/router';
interface wfData {
  planIdx: number,
  UnitNumbe: number,
  Modality: string,
  ScanDate: number,
  Contours_and_Prescription: number,
  Assign_Dosimetrist: number,
  Treatment_Planning: number,
  Ready_for_MD: number,
  MD_Approved: number,
  Plan_Write_up: number,
  Physic_Plan_Check: number,
  Pre_Treatment_QA: number,
  SimDate: number,
  StartDate: number,
  StartDateDate: Date,
  MDLastName: string,
  isUrgent?: number,
  PhysLastName:string,
  patLastName: string,
  info: number
}
interface Override {
  PlanIdx: number,
  reasonIdx: number
}
interface userInfo {
   UserKey: string,
   UserLastName: string,
   Privilege: number
 }
@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  title = 'MD_View';
  options: any
  options2: any
  params:any
  userid:string = ""
  theData: any
  plans: any
  overRides: Override[] = Array()
  CTSimToContComp: any  = []  
  PercentCTSimToContComp: any = []   
  maxDays: number = 10  
  AMDStats: any = []
  userInfo: userInfo = {  UserKey: '',UserLastName: '',Privilege: 9}
  numPlans: number = 0
  numUrgent: number = 0
  HCseries:any = []
  HCcategories: any = []
  graphHeight: number = 200
  collectionDates: string[] = []
  numReplans: number = 0
  seriesName: string = ''
  link:string = "https://whiteboard.partners.org/esb/FLwbe/QAdashBd/bootStrap/dist/boot3/#/face?userid="
  isUserMD: boolean = false
  MDNames:[] = []

  constructor (private route: ActivatedRoute, private router: Router,  private  http: HttpClient){}
  ngOnInit(): void {
   this .AMDStats = []
   this.route.queryParams.subscribe(params => {
   this .params = params
   this .userid = params['userid']
   if (this .userid)
      this .link +=this .userid
         this .getUserInfo(this .userid).subscribe(res=>{
         this .userInfo =  res
         console.log("7777 iserInfo %o  userIsMD is %o", this .userInfo, this .isUserMD) 
      }) 
    })
    let dates = this.last30Days()
    this .collectionDates = dates
    this .getWFdataByStartDate(dates).subscribe(res =>{   //getPlansByStartDate.php  -  uses dev version"
      let rData:any = res 
      this .theData = rData
      this .MDNames = rData[0]['MDNames']
console.log("8787 theData %o  MDNames is %o  userIsMD %o", this .theData, this.MDNames, this .isUserMD)      
      this .theData['overrides'] = []
      this .plans = rData[0][0]
      this .initializeCTSimToContComp()
      this .makeEmptyDist()    
      this .makeEmptyTimingDist()
      this.populateByPassFail()
      this .calcPercent()
      this .loadIntoHC()
      this .loadCategories()

   if (this .isUserMDfunc())
     this .showGraphs()
    })

  }
showGraphs(){
   this .setOptions()
   this .setOptions2()
   Highcharts.chart('container', this .options)
   Highcharts.chart('container2', this .options2)
}


btnClick(){
   console.log("clicked")
   let add = '/#/face?userid=wolfgang'
   parent.location.href = this .link;
}  
initializeCTSimToContComp(){
   if (this .CTSimToContComp && this .CTSimToContComp[0]  ){
      this .CTSimToContComp[0]  = this .CTSimToContComp[0].slice(0, this .maxDays+1)
      this .CTSimToContComp[1]  = this .CTSimToContComp[1].slice(0, this .maxDays+1)
      }
}

/**
 * Go thru the list of MDs and create the data skeleton to be filled out by pass/fail data for each MD
 */   
makeEmptyDist(){
   let i = 0
   if ( this .AMDStats  )
      this .AMDStats.splice(0)
   Object.keys(this.theData[0]['MDNames']).forEach((key:string)=>{
   if ( this.userInfo['UserKey']  == key  ) {             // if users is MD and not a ViewAll
            this .AMDStats[key] = new MDstat(+key,this.theData[0]['MDNames'][key] ) 
            this .isUserMD = true         
         i++
         }
   });
   this.AMDStats['DeptTotal'] = new MDstat(i,'Dept.Total' ) 

}  
makeEmptyTimingDist(){
   this .CTSimToContComp = Array()

      this .CTSimToContComp[0] = Array()
      this .CTSimToContComp[1] = Array()
      for (let i = 0; i <= this .maxDays+1; i++){
        this .CTSimToContComp[0][i] = 0
        this .CTSimToContComp[1][i] = 0
      }
   }

  populateByPassFail(){
    for (let key in this .plans){                                  // main loop thru the plans
       this .numPlans++
       let verdict = -1                                            // default verdict
    // Skip Urgent plans
       if (this.plans && this.plans[key]['urgent'] =='1'){                       // skip Urgent plans
          this .numUrgent++
          continue;
       }
    // Skip specified Modalities
       if (this.plans[key]['Modality']){
          if (this.plans[key]['Modality'].includes('TBI') || this.plans[key]['Modality'].includes('2DXRT') 
             || this.plans[key]['Modality'].includes('SRS') || this.plans[key]['Modality'].includes('IORT')  )
             continue;     
          if (this .plans[key]['StartDate'] !== this .plans[key]['authStartDate'])
             this .plans[key]['UnitNumber']  +='AAA'   
          if (this.plans[key]['info'] > 0) {                                 // it is a Replan/Rescan
           // this .numReplans++;                                              // count it
             verdict = 4                                                   // EXCLUDE from pass/fail  --- Changed to PASS the plan
             }
             /*  process overrides         */
          if (this .theData['overrides'].hasOwnProperty(this .plans[key]['planIdx']))     {//
             this .overRides.push({PlanIdx:this .plans[key]['planIdx'], reasonIdx:this .theData['overrides'][this .plans[key]['planIdx']]['ReasonIdx']}  )  // add to the collection
             if (this .theData['overrides'][this .plans[key]['planIdx']]['ReasonIdx'] < 100)
                   verdict = 1                                                // indicates a pass which is used in the 3-5-7 day sorts
             if (this .theData['overrides'][this .plans[key]['planIdx']]['ReasonIdx'] > 100  && this .theData['overrides'][this .plans[key]['planIdx']]['ReasonIdx'] < 200 )
                   verdict = 2                                               // indicates a FAIL which is used in the 3-5-7 day sorts         
             if (this .theData['overrides'][this .plans[key]['planIdx']]['ReasonIdx'] > 200 ){
                   verdict = 3                                               // indicates a EXCLUDE which is used in the 3-5-7 day sorts     
                   continue;                                                   // DO NOT process the 357 day sort for this plan 
             }       
          }
 
       // Update MD and Dept Totals
          if (this .AMDStats[this.plans[key]['MDKey']])
             this .AMDStats[this.plans[key]['MDKey']]['total']++
          this .AMDStats['DeptTotal']['total']++

         if (this.userInfo['UserKey'] == this.plans[key]['MDKey']){
            if ( this.plans[key]['workdays2'] < this .maxDays)
               this .CTSimToContComp[0][this.plans[key]['workdays2']]++
            else   
               this .CTSimToContComp[0][this .maxDays]++ 
         }
         else {
            if ( this.plans[key]['workdays2'] < this .maxDays){
               if (!this .CTSimToContComp[1][this.plans[key]['workdays2']])
                  this .CTSimToContComp[1][this.plans[key]['workdays2']] = 1
               else
                  this .CTSimToContComp[1][this.plans[key]['workdays2']]++
               }
            else   {
                  if (!this .CTSimToContComp[1]){
                     this .CTSimToContComp[1]= []
                     this .CTSimToContComp[1][this .maxDays] = 1
                  }
                  else
                   this .CTSimToContComp[1][this .maxDays]++       
               }
            }                                                                                            // end of 'singleMD ' code 
          // 5 day sort
          if (this.plans[key]['Modality'].indexOf('VMAT') >=0 || this.plans[key]['Modality'].indexOf('IMRT') >=0 || this.plans[key]['Modality'].indexOf('SBRT' )>=0 
             || this.plans[key]['Modality'].indexOf('Ethos')>=0 )
          {
             if  (+this .plans[key]['workdays'] >= 5 || verdict == 1 || verdict ==4){   // either IS a pass of Override Pass
                if (this .AMDStats[this.plans[key]['MDKey']])                           //  if SingleMD view then ONLY that MD will have entry in AMDStats dS
                   this .AMDStats[this.plans[key]['MDKey']]['pass5']++
                this .AMDStats['DeptTotal']['pass5']++
                this .plans[key]['verdict'] = 'Pass'
                if (verdict == 1)
                   this .plans[key]['verdict'] = 'OverridePass'
                if (verdict == 4)
                   this .plans[key]['verdict'] = 'Rescan Pass'   
             }
             else   {
                if (this .AMDStats[this.plans[key]['MDKey']]){
                   this .AMDStats[this.plans[key]['MDKey']]['fail5']++
                   this .AMDStats[this.plans[key]['MDKey']]['fails'].push(this.plans[key]['UnitNumber'])
                }
                this .AMDStats['DeptTotal']['fail5']++
                this .plans[key]['verdict'] = 'Fail'
                }
             }
          // 3 day sort
          if (this.plans[key]['Modality'].indexOf('3DXRT') >=0){
             if  (+this .plans[key]['workdays'] >= 3  || verdict == 1 || verdict ==4){
                if (this .AMDStats[this.plans[key]['MDKey']])
                 this .AMDStats[this.plans[key]['MDKey']]['pass3']++
                this .AMDStats['DeptTotal']['pass3']++
                this .plans[key]['verdict'] = 'Pass'
                if (verdict == 1)
                   this .plans[key]['verdict'] = 'OverridePass'
                if (verdict == 4)
                   this .plans[key]['verdict'] = 'Rescan Pass'       
             }
             else   {
                if (this .AMDStats[this.plans[key]['MDKey']]){
                this .AMDStats[this.plans[key]['MDKey']]['fail3']++
                this .AMDStats[this.plans[key]['MDKey']]['fails'].push(this.plans[key]['UnitNumber'])
                }
                this .AMDStats['DeptTotal']['fail3']++
                this .plans[key]['verdict'] = 'Fail'
                }
             }
          // 7 day sort
          if (this.plans[key]['Modality'].indexOf('roton') >=0){
             if  (+this .plans[key]['workdays'] >= 7  || verdict == 1 || verdict ==4 ){
                               if (this .AMDStats[this.plans[key]['MDKey']])
                this .AMDStats[this.plans[key]['MDKey']]['pass7']++
                this .AMDStats['DeptTotal']['pass7']++
                this .plans[key]['verdict'] = 'Pass'
                if (verdict == 1)
                   this .plans[key]['verdict'] = 'OverridePass'
                if (verdict == 4)
                   this .plans[key]['verdict'] = 'Rescan Pass'     
             }
             else   {
                if (this .AMDStats[this.plans[key]['MDKey']]){
                this .AMDStats[this.plans[key]['MDKey']]['fail7']++
 
                this .AMDStats[this.plans[key]['MDKey']]['fails'].push(this.plans[key]['UnitNumber'])
                }
                this .AMDStats['DeptTotal']['fail7']++
                if (this .AMDStats[this.plans[key]['MDKey']])
                this .plans[key]['verdict'] = 'Fail'
                }
                }   
             }
            }    
    }  
/**
 * go thru the pass/fail numbers and calculate the pass/Fail percent.  MNM for CTSim to ContCompl hist if UserIsMD
 */
calcPercent(){
   let pfNames = ['pass7','pass5','pass3','fail7','fail5','fail3']      // make the names for the dataStructure
   let MDtotal = 0;
   for ( let key in this .AMDStats){
      MDtotal = 0
      for ( let key2 of pfNames){                                       // calculate the total of each MD's plan
         MDtotal += this .AMDStats[key][key2]
      }
      for ( let key2 of pfNames){
         let pcName = key2 +"PC"                                           // make the name for the Percent datum 
       //  this .AMDStats[key][pcName] =(100* this .AMDStats[key][key2]/this .AMDStats[key]['total']).toFixed(1) // calc the percent
         this .AMDStats[key][pcName] =(100* this .AMDStats[key][key2]/MDtotal).toFixed(1) // calc the percent     
      }
   }
   // Data for the Lower graph on the MD View
  {                                                    // calc data for lower graph on MD page
      let total = []
      for (let i=0; i < 2; i++){                                           // loop to calculate the total for denominator of percent
         total[i] = 0
         for (let j = 0; j <= this.maxDays; j++){
            total[i] += this .CTSimToContComp[i][j]
         }
      }
      for (let i=0; i < 2; i++){                                           // loop to calculate the  percent
         this .PercentCTSimToContComp[i] = []
         for (let j = 0; j <= this.maxDays; j++){
            this. PercentCTSimToContComp[i][j] = +(100 * this .CTSimToContComp[i][j]/total[i]).toFixed(1)
         }
      } 
   }

}
/**
* load the colors and Category names into the HighCharts 'series' dataStructure
*/  
loadIntoHC(){
   this .HCseries =  [{
     name: 'PBS Pass',
     data: [],
     color: '#65ceeb'
  }, {
     name: 'VMAT Pass',
     data: [],
     color: '#ABFAFD'
  }, {
     name: '3D_XRT Pass',
     data: [],
     color: '#DBF896'
  },
  {
   name: 'PBS Fail',
   data: [],
   color: '#d4333e '
  },
  {
   name: 'VMAT Fail',
   data: [],
   color: 'orange'
  },
  {
   name: '3D-SRT Fail',
   data: [],
   color: '#F5DD10 '
  }, 
  ]
     let PCN = ['pass7PC','pass5PC','pass3PC','fail7PC','fail5PC','fail3PC']
     let ind = 0
     this .HCcategories.splice(0)                             // clear data from previous run co
     for (let key in this .AMDStats){                         
        let idx = 0
        for (let k3 in PCN){                                  // add each passFail percent datum 
           this .HCseries[idx++]['data'][ind] = +this .AMDStats[key][PCN[k3]]
           }
           ind++
        }   
  }
  /**
 * Load the labels for the legend
 */
loadCategories(){
   for (let key in this .AMDStats) {
      let value = this .AMDStats[key];
      let label = ''
      if (value)
      {
        label = "Dr. "+ this .AMDStats[key].MDLastName +   "[" + this .AMDStats[key].total + " plans] ";   // label for each MD
        if (key.includes('otal'))                                             // 'Total' label is different
           label = "Dept. Total [" + this .AMDStats['DeptTotal']['total'] + ' plans ]';    
        if (!label.includes('fined'))                                         // check that the label is defined
          this .HCcategories.push(label)
       } 
      }
}
/**
 * Set options for the top graph
 */
setOptions(){
   this .options = 
   {
      chart: {
        type: 'bar',
        height: 180,
    },
    title: {  
      text: '<span style="font-size:10pt;">Contour-Completion to Start Date [Last 30 days]</span>',
      style:{
         color:"#333333",
    
         }
   },
   // subtitle :{text: "Data Collected from "+ this.collectionDates[0] + " to " + this.collectionDates[1] },
    xAxis: { 
      categories: this .HCcategories,
      style: {
         fontSize:'6px',
         }
      },
    yAxis: [{
        min: 0,
        max: 100,
        title: {text: 'Percent of Plans'},
        labels: {
            style: {
               fontSize:'12px',
               color:'#666666'
            },   
        }
    }],
    legend: {
   
         itemStyle: {
            font: '8pt Trebuchet MS, Verdana, sans-serif',
            color: 'black'
         },
         itemHoverStyle: {
            color: 'grey'
         },
         itemHiddenStyle: {
            color: '#444'
         },


        reversed: true,
        enabled: true
    },
    plotOptions: {
        series: {stacking: 'normal'}
    },
    series : this .HCseries,

}
}

setOptions2(){
  if (this .AMDStats &&  this .AMDStats[this .userInfo.UserKey])
      this .seriesName = 'Days for Dr. ' + this .AMDStats[this .userInfo.UserKey].MDLastName
   let xTics = Array()
   for (let i = 0; i < this .maxDays; i++)
     xTics.push(i) 
   xTics[10] = " >= 10 "  

   this .options2 = 
   {
     chart: {
       type: 'column',
       height: '200',
       pointWidth:'5'
     },
     title: {  
       text: '<span style="font-size:10pt;">CT-Sim to Contour Completion [Last 30 days]</span>',
     },
     subtitle: {
       text: ''
     },
     xAxis: {
       categories: xTics,
       label: 'Percent of Plans',
       crosshair: true
     },
     yAxis: {
       min: 0,
       title: {
         text: 'Percent of Plans'
       }
     },
     tooltip: {
       headerFormat: '<span style="font-size:10px">{point.key}</span><table>',
       pointFormat: '<tr><td style="color:{series.color};padding:0">{series.name}: </td>' +
         '<td style="padding:0"><b>{point.y:.1f}% of Plans</b></td></tr>',
       footerFormat: '</table>',
       shared: true,
       useHTML: true
     },
     plotOptions: {
       column: {
         pointPadding: 0,
         borderWidth: 0,
         groupPadding: 0,
         shadow: false
       }
     },
     series: [
       {
       name: this .seriesName,
       data: this .PercentCTSimToContComp[0],
       pointWidth: 20
     },
     {
       name: 'Days for Dept.',
       data: this .PercentCTSimToContComp[1],
       pointWidth: 20
     },
   ]
   }   
   Highcharts.chart('container2', this .options2)                          // create the Graph
 }

   getUserInfo(data: any,mode?: any): Observable<userInfo>{  
   var host = window.location.host;
      let url = "https://whiteboard.partners.org/esb/FLwbe/QAdashBd/getUserInfo.php";		
      if (isDevMode())
      url = "https://whiteboard.partners.org/esb/FLwbe/QAdashBd/dev/getUserInfo.php";			//    
      return this .http.post<userInfo>(url, JSON.stringify(data))
      }    

  getWFdataByStartDate(dates?:any): Observable<wfData>{  
    let url = "https://whiteboard.partners.org/esb/FLwbe/QAdashBd/getPlansByStartDate.php";			// 
    if (isDevMode())
      url =  "https://whiteboard.partners.org/esb/FLwbe/QAdashBd/dev/getPlansByStartDate.php?userid="+this.userid;  
console.log("507507 url is %o", url)   
      return this .http.post<any>(url, JSON.stringify(dates))
 }  
 isUserMDfunc(){
   for (let key in this .MDNames) {
      if (this.userInfo['UserKey'] == key){
         console.log('FOUND')
         return true
      }
   }
   return false;
 }

last30Days(){
    var today = new Date();
    var priorDate = new Date(new Date().setDate(today.getDate() - 30));
    return [priorDate.toISOString().split('T')[0], today.toISOString().split('T')[0] ]
  }

setGraph(){
    this .options = {
      chart: {
        type: "spline"
     },
     title: {
        text: "Monthly--- Temperature"
     },
    series: [
         {
            name: 'Tokyo',
            data: [7.0, 6.9, 9.5, 14.5, 18.2, 21.5, 25.2,26.5, 23.3, 18.3, 13.9, 9.6]
         },
         {
            name: 'New York',
            data: [-0.2, 0.8, 5.7, 11.3, 17.0, 22.0, 24.8,24.1, 20.1, 14.1, 8.6, 2.5]
         },
         {
            name: 'Berlin',
            data: [-0.9, 0.6, 3.5, 8.4, 13.5, 17.0, 18.6, 17.9, 14.3, 9.0, 3.9, 1.0]
         },
         {
            name: 'London',
            data: [3.9, 4.2, 5.7, 8.5, 11.9, 15.2, 17.0, 16.6, 14.2, 10.3, 6.6, 4.8]
         }
      ]
    }
  }
}
/**
 * Holds all the parameters for the Contour Metric data analysis
 */
class MDstat {
   MDKey: number
   MDLastName: string
   ServiceName: string = ''
   pass3:number = 0
   pass3PC:number = 0
   fail3: number = 0
   fail3PC: number = 0
   pass5:number = 0
   pass5PC:number = 0
   fail5: number = 0
   fail5PC: number = 0
   pass7:number = 0
   pass7PC:number = 0
   fail7: number = 0
   fail7PC: number = 0
   total: number = 0
   total2: number = 0
   fails : number[] = [];
   constructor(MDKey: number, MDLastName:string){
     this .MDKey = MDKey
     this .MDLastName = MDLastName
   }
 }